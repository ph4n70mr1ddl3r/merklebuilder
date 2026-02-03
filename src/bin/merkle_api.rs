use std::env;
use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::Arc;

use axum::Json;
use axum::Router;
use axum::extract::{Path, State};
use axum::http::{Method, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use merklebuilder::merkle::{
    ProofResult, available_layers, build_proof, ensure_db_present, to_hex32,
};
use serde::Serialize;
use thiserror::Error;
use tokio::net::TcpListener;
use tower::ServiceBuilder;
use tower_http::cors::{Any, CorsLayer};

#[derive(Clone)]
struct AppState {
    db_dir: Arc<PathBuf>,
}

#[derive(Debug, Error)]
enum ApiError {
    #[error("bad request: {0}")]
    BadRequest(String),
    #[error("not found: {0}")]
    NotFound(String),
    #[error("internal error: {0}")]
    Internal(String),
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let status = match self {
            ApiError::BadRequest(_) => StatusCode::BAD_REQUEST,
            ApiError::NotFound(_) => StatusCode::NOT_FOUND,
            ApiError::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        };
        let body = Json(ErrorBody {
            error: self.to_string(),
        });
        (status, body).into_response()
    }
}

#[derive(Serialize)]
struct ErrorBody {
    error: String,
}

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
}

#[derive(Serialize)]
struct ProofNode {
    level: usize,
    sibling_index: usize,
    side: String,
    hash: String,
}

#[derive(Serialize)]
struct ProofResponse {
    address: String,
    index: usize,
    total: usize,
    lookups: usize,
    leaf: String,
    root: String,
    root_level: usize,
    proof: Vec<ProofNode>,
    proof_flags: Vec<bool>,
}

impl From<ProofResult> for ProofResponse {
    fn from(proof: ProofResult) -> Self {
        let ProofResult {
            normalized_address,
            index,
            total,
            lookups,
            leaf,
            root,
            root_level,
            steps,
        } = proof;

        let proof_flags: Vec<bool> = steps.iter().map(|step| step.side.proof_flag()).collect();
        let proof_nodes: Vec<ProofNode> = steps
            .into_iter()
            .map(|step| ProofNode {
                level: step.level,
                sibling_index: step.sibling_index,
                side: step.side.as_str().to_string(),
                hash: to_hex32(&step.sibling_hash),
            })
            .collect();

        ProofResponse {
            address: normalized_address,
            index,
            total,
            lookups,
            leaf: to_hex32(&leaf),
            root: to_hex32(&root),
            root_level,
            proof: proof_nodes,
            proof_flags,
        }
    }
}

#[derive(Debug, Clone)]
struct Config {
    listen: SocketAddr,
    data_dir: PathBuf,
}

fn parse_args() -> Result<Config, String> {
    let mut args = env::args().skip(1);
    let mut listen: SocketAddr = "127.0.0.1:3000"
        .parse()
        .map_err(|e| format!("Invalid default listen address: {e}"))?;
    let mut data_dir = PathBuf::from("merkledb");

    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--listen" | "-l" => {
                let raw = args
                    .next()
                    .ok_or_else(|| "--listen requires an address like 0.0.0.0:3000".to_string())?;
                listen = raw
                    .parse()
                    .map_err(|e| format!("Invalid listen address '{raw}': {e}"))?;
            }
            "--data-dir" | "-d" => {
                let raw = args
                    .next()
                    .ok_or_else(|| "--data-dir requires a path".to_string())?;
                data_dir = PathBuf::from(raw);
            }
            other => return Err(format!("Unknown argument: {other}")),
        }
    }

    Ok(Config { listen, data_dir })
}

#[tokio::main]
async fn main() {
    let config = match parse_args() {
        Ok(cfg) => cfg,
        Err(e) => {
            eprintln!("{e}");
            eprintln!("Usage: merkle_api [--listen <addr:port>] [--data-dir <path>]");
            std::process::exit(1);
        }
    };

    if let Err(e) = ensure_db_present(&config.data_dir) {
        eprintln!("Error: {e}");
        std::process::exit(1);
    }

    let layer_count = available_layers(&config.data_dir).len();
    println!(
        "Serving Merkle API from {} ({} layer files) on http://{}",
        config.data_dir.display(),
        layer_count,
        config.listen
    );
    println!("CORS enabled for all origins");

    let state = AppState {
        db_dir: Arc::new(config.data_dir.clone()),
    };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::OPTIONS])
        .allow_headers(Any);

    // Note: Rate limiting disabled for localhost testing
    // In production, use a reverse proxy (nginx) for rate limiting
    let app = Router::new()
        .route("/health", get(health))
        .route("/proof/:address", get(proof))
        .layer(ServiceBuilder::new().layer(cors))
        .with_state(state);

    let listener = match TcpListener::bind(config.listen).await {
        Ok(l) => l,
        Err(e) => {
            eprintln!("Failed to bind {}: {e}", config.listen);
            std::process::exit(1);
        }
    };

    if let Err(e) = axum::serve(listener, app).await {
        eprintln!("Server error: {e}");
        std::process::exit(1);
    }
}

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse { status: "ok" })
}

async fn proof(
    Path(address): Path<String>,
    State(state): State<AppState>,
) -> Result<Json<ProofResponse>, ApiError> {
    let proof = build_proof(&state.db_dir, &address).map_err(classify_error)?;
    Ok(Json(proof.into()))
}

fn classify_error(err: String) -> ApiError {
    if matches_invalid_input(&err) {
        ApiError::BadRequest(err)
    } else if matches_not_found(&err) {
        ApiError::NotFound(err)
    } else {
        ApiError::Internal(err)
    }
}

fn matches_invalid_input(err: &str) -> bool {
    err.contains("Address must") || err.contains("Invalid hex")
}

fn matches_not_found(err: &str) -> bool {
    err.contains("not found in addresses.bin")
}

#[cfg(test)]
mod tests {
    use super::*;
    use merklebuilder::merkle::build_proof;
    use sha3::{Digest, Keccak256};
    use std::fs::File;
    use std::io::Write;
    use std::path::PathBuf;
    use tempfile::TempDir;

    fn hash_address(addr: &[u8]) -> [u8; 32] {
        let mut hasher = Keccak256::new();
        hasher.update(addr);
        hasher.finalize().into()
    }

    fn hash_pair(left: &[u8; 32], right: &[u8; 32]) -> [u8; 32] {
        let mut hasher = Keccak256::new();
        hasher.update(left);
        hasher.update(right);
        hasher.finalize().into()
    }

    fn create_test_db() -> (TempDir, PathBuf) {
        let temp_dir = TempDir::new().unwrap();
        let db_dir: PathBuf = temp_dir.path().to_path_buf();

        let test_address = [0x01u8; 20];

        let addresses_path = db_dir.join("addresses.bin");
        let mut addresses_file = File::create(&addresses_path).unwrap();
        addresses_file.write_all(&test_address).unwrap();
        addresses_file.write_all(&[0x02u8; 20]).unwrap();
        addresses_file.write_all(&[0x03u8; 20]).unwrap();

        let addr1_hash = hash_address(&test_address);
        let addr2_hash = hash_address(&[0x02u8; 20]);
        let addr3_hash = hash_address(&[0x03u8; 20]);

        let layer00_path = db_dir.join("layer00.bin");
        let mut layer00_file = File::create(&layer00_path).unwrap();
        layer00_file.write_all(&addr1_hash).unwrap();
        layer00_file.write_all(&addr2_hash).unwrap();
        layer00_file.write_all(&addr3_hash).unwrap();

        let hash01 = hash_pair(&addr1_hash, &addr2_hash);
        let hash23 = hash_pair(&addr3_hash, &addr3_hash);

        let layer01_path = db_dir.join("layer01.bin");
        let mut layer01_file = File::create(&layer01_path).unwrap();
        layer01_file.write_all(&hash01).unwrap();
        layer01_file.write_all(&hash23).unwrap();

        let root_hash = hash_pair(&hash01, &hash23);

        let layer02_path = db_dir.join("layer02.bin");
        let mut layer02_file = File::create(&layer02_path).unwrap();
        layer02_file.write_all(&root_hash).unwrap();

        (temp_dir, db_dir)
    }

    #[test]
    fn test_build_proof_success() {
        let (_temp, db_dir) = create_test_db();
        let address_str = "0x0101010101010101010101010101010101010101";

        let result = build_proof(&db_dir, address_str);
        assert!(result.is_ok());

        let proof = result.unwrap();
        assert_eq!(proof.index, 0);
        assert_eq!(proof.total, 3);
        assert_eq!(proof.root_level, 2);
        assert!(!proof.steps.is_empty());
    }

    #[test]
    fn test_build_proof_address_not_found() {
        let (_temp, db_dir) = create_test_db();
        let address_str = "0xffffffffffffffffffffffffffffffffffffffff";

        let result = build_proof(&db_dir, address_str);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("not found"));
    }

    #[test]
    fn test_proof_result_structure() {
        let (_temp, db_dir) = create_test_db();
        let address_str = "0x0101010101010101010101010101010101010101";

        let proof = build_proof(&db_dir, address_str).unwrap();
        assert_eq!(proof.steps.len(), 2);
        assert_eq!(proof.steps[0].level, 0);
        assert_eq!(proof.steps[1].level, 1);
    }

    #[test]
    fn test_classify_error_invalid_input() {
        let err = "Address must be 40 hex characters";
        let api_error = classify_error(err.to_string());
        assert!(matches!(api_error, ApiError::BadRequest(_)));
    }

    #[test]
    fn test_classify_error_not_found() {
        let err = "not found in addresses.bin";
        let api_error = classify_error(err.to_string());
        assert!(matches!(api_error, ApiError::NotFound(_)));
    }

    #[test]
    fn test_classify_error_internal() {
        let err = "Some internal error";
        let api_error = classify_error(err.to_string());
        assert!(matches!(api_error, ApiError::Internal(_)));
    }
}
