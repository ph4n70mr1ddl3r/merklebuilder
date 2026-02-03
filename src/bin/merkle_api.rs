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
    Ok(Json(ProofResponse::from(proof)))
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
