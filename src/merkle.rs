use std::cmp::Ordering;
use std::fmt;
use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::path::{Path, PathBuf};

use sha3::{Digest, Keccak256};

use crate::{ADDRESS_HEX_LENGTH, ADDRESS_SIZE, HASH_SIZE, MAX_ADDRESSES};

#[derive(Debug, Clone)]
pub enum MerkleError {
    InvalidAddress(String),
    InvalidHex(String),
    AddressNotFound,
    InvalidLayer(String),
    FileIo(String),
    MissingLayer(String),
    CorruptedData(String),
    IndexOutOfBounds {
        level: usize,
        index: usize,
        count: usize,
    },
    Internal(String),
}

impl fmt::Display for MerkleError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            MerkleError::InvalidAddress(msg) => write!(f, "Invalid address: {}", msg),
            MerkleError::InvalidHex(msg) => write!(f, "Invalid hex: {}", msg),
            MerkleError::AddressNotFound => write!(f, "Address not found in addresses.bin"),
            MerkleError::InvalidLayer(msg) => write!(f, "Invalid layer: {}", msg),
            MerkleError::FileIo(msg) => write!(f, "File I/O error: {}", msg),
            MerkleError::MissingLayer(msg) => write!(f, "Missing layer: {}", msg),
            MerkleError::CorruptedData(msg) => write!(f, "Corrupted data: {}", msg),
            MerkleError::IndexOutOfBounds {
                level,
                index,
                count,
            } => {
                write!(
                    f,
                    "Index {} out of bounds at level {} (count: {})",
                    index, level, count
                )
            }
            MerkleError::Internal(msg) => write!(f, "Internal error: {}", msg),
        }
    }
}

impl std::error::Error for MerkleError {}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SiblingSide {
    Left,
    Right,
}

impl SiblingSide {
    #[must_use]
    pub fn as_str(&self) -> &'static str {
        match self {
            SiblingSide::Left => "left",
            SiblingSide::Right => "right",
        }
    }

    #[must_use]
    pub fn proof_flag(&self) -> bool {
        matches!(self, SiblingSide::Left)
    }
}

#[derive(Debug, Clone)]
pub struct ProofStep {
    pub level: usize,
    pub sibling_index: usize,
    pub sibling_hash: [u8; 32],
    pub side: SiblingSide,
}

#[derive(Debug, Clone)]
pub struct ProofResult {
    pub normalized_address: String,
    pub index: usize,
    pub total: usize,
    pub lookups: usize,
    pub leaf: [u8; 32],
    pub root: [u8; 32],
    pub root_level: usize,
    pub steps: Vec<ProofStep>,
}

/// Builds a Merkle proof for the given address.
///
/// # Errors
/// Returns an error if the address is invalid, not found in the database,
/// or if the layer files are missing or corrupted.
pub fn build_proof(db_dir: &Path, address_str: &str) -> Result<ProofResult, MerkleError> {
    let address = parse_address(address_str)?;
    let addresses_path = db_dir.join("addresses.bin");
    let (index, steps, total) =
        find_address_index(&addresses_path, &address)?.ok_or(MerkleError::AddressNotFound)?;

    if total > MAX_ADDRESSES {
        return Err(MerkleError::InvalidLayer(format!(
            "Address count {} exceeds maximum of {}",
            total, MAX_ADDRESSES
        )));
    }

    let leaf_hash = hash_leaf(&address);
    let mut proof_steps = Vec::new();
    let mut level = 0usize;
    let mut path_index = index;

    loop {
        let filename = format!("layer{level:02}.bin");
        let layer_path = db_dir.join(filename);
        if !layer_path.exists() {
            if level == 0 {
                return Err(MerkleError::MissingLayer(
                    "No layer files found (expected layer00.bin, layer01.bin, ...)".to_string(),
                ));
            }
            return Err(MerkleError::MissingLayer(format!(
                "Missing layer file for level {} (expected {})",
                level,
                layer_path.display()
            )));
        }

        let node_count = layer_node_count(&layer_path)?;
        if node_count == 0 {
            return Err(MerkleError::CorruptedData(format!(
                "Layer {level:02} is empty"
            )));
        }
        if path_index >= node_count {
            return Err(MerkleError::IndexOutOfBounds {
                level,
                index: path_index,
                count: node_count,
            });
        }

        if node_count == 1 {
            let root = read_node(&layer_path, 0)?;
            return Ok(ProofResult {
                normalized_address: normalize_hex(address_str),
                index,
                total,
                lookups: steps,
                leaf: leaf_hash,
                root,
                root_level: level,
                steps: proof_steps,
            });
        }

        let is_left = path_index % 2 == 0;
        let sibling_idx = if is_left {
            path_index.saturating_add(1).min(node_count - 1)
        } else {
            path_index.saturating_sub(1)
        };

        let sibling_hash = read_node(&layer_path, sibling_idx)?;
        proof_steps.push(ProofStep {
            level,
            sibling_index: sibling_idx,
            sibling_hash,
            side: if is_left {
                SiblingSide::Right
            } else {
                SiblingSide::Left
            },
        });

        path_index /= 2;
        level += 1;
    }
}

/// Parses an Ethereum address from a hex string.
///
/// # Errors
/// Returns an error if the address is not a valid 40-character hex string
/// or if the hex decoding fails.
pub fn parse_address(raw: &str) -> Result<[u8; ADDRESS_SIZE], MerkleError> {
    let cleaned = raw
        .strip_prefix("0x")
        .or_else(|| raw.strip_prefix("0X"))
        .unwrap_or(raw);
    if cleaned.len() != ADDRESS_HEX_LENGTH {
        return Err(MerkleError::InvalidAddress(format!(
            "Address must be {ADDRESS_HEX_LENGTH} hex characters after 0x"
        )));
    }

    let mut buf = [0u8; ADDRESS_SIZE];
    hex::decode_to_slice(cleaned, &mut buf)
        .map_err(|_| MerkleError::InvalidHex("Invalid hex in address".to_string()))?;
    Ok(buf)
}

#[must_use]
pub fn normalize_hex(raw: &str) -> String {
    if raw.starts_with("0x") {
        raw.to_string()
    } else if let Some(stripped) = raw.strip_prefix("0X") {
        format!("0x{stripped}")
    } else {
        format!("0x{raw}")
    }
}

pub fn hash_leaf(address: &[u8; ADDRESS_SIZE]) -> [u8; HASH_SIZE] {
    let mut hasher = Keccak256::new();
    hasher.update(address);
    hasher.finalize().into()
}

pub fn layer_node_count(path: &Path) -> Result<usize, MerkleError> {
    let len = File::open(path)
        .and_then(|f| f.metadata())
        .map_err(|e| MerkleError::FileIo(format!("Failed to read {}: {e}", path.display())))?
        .len();
    if len % HASH_SIZE as u64 != 0 {
        return Err(MerkleError::CorruptedData(format!(
            "Layer file {} is not a multiple of {HASH_SIZE} bytes ({len})",
            path.display()
        )));
    }
    Ok((len / HASH_SIZE as u64) as usize)
}

pub fn read_node(path: &Path, index: usize) -> Result<[u8; HASH_SIZE], MerkleError> {
    let mut file = File::open(path)
        .map_err(|e| MerkleError::FileIo(format!("Unable to open {}: {e}", path.display())))?;
    let offset = index
        .checked_mul(HASH_SIZE)
        .ok_or(MerkleError::IndexOutOfBounds {
            level: 0,
            index,
            count: 0,
        })?;
    file.seek(SeekFrom::Start(offset as u64))
        .map_err(|e| MerkleError::FileIo(format!("Seek failed in {}: {e}", path.display())))?;
    let mut buf = [0u8; HASH_SIZE];
    file.read_exact(&mut buf)
        .map_err(|e| MerkleError::FileIo(format!("Read failed in {}: {e}", path.display())))?;
    Ok(buf)
}

pub fn find_address_index(
    path: &Path,
    target: &[u8; ADDRESS_SIZE],
) -> Result<Option<(usize, usize, usize)>, MerkleError> {
    let mut file = File::open(path)
        .map_err(|e| MerkleError::FileIo(format!("Failed to open {}: {e}", path.display())))?;
    let len = file
        .metadata()
        .map_err(|e| MerkleError::FileIo(format!("Failed to stat {}: {e}", path.display())))?
        .len();
    if len % ADDRESS_SIZE as u64 != 0 {
        return Err(MerkleError::CorruptedData(format!(
            "addresses.bin is not a multiple of {ADDRESS_SIZE} bytes ({len})"
        )));
    }
    let total = (len / ADDRESS_SIZE as u64) as usize;
    if total == 0 {
        return Ok(None);
    }

    if total > MAX_ADDRESSES {
        return Err(MerkleError::CorruptedData(format!(
            "Address count {} exceeds maximum of {}",
            total, MAX_ADDRESSES
        )));
    }

    let mut low = 0usize;
    let mut high = total;
    let mut buf = [0u8; ADDRESS_SIZE];
    let mut steps = 0usize;

    while low < high {
        let mid = low.wrapping_add(high) / 2;
        file.seek(SeekFrom::Start(
            (mid as u64).saturating_mul(ADDRESS_SIZE as u64),
        ))
        .map_err(|e| MerkleError::FileIo(format!("Seek failed in {}: {e}", path.display())))?;
        file.read_exact(&mut buf)
            .map_err(|e| MerkleError::FileIo(format!("Read failed in {}: {e}", path.display())))?;
        steps = steps.saturating_add(1);
        match buf.cmp(target) {
            Ordering::Less => {
                low = mid.saturating_add(1);
            }
            Ordering::Greater => {
                high = mid;
            }
            Ordering::Equal => return Ok(Some((mid, steps, total))),
        }
    }

    Ok(None)
}

#[must_use]
fn to_hex<const N: usize>(bytes: &[u8; N]) -> String {
    format!("0x{}", hex::encode(bytes))
}

#[must_use]
pub fn to_hex32(bytes: &[u8; HASH_SIZE]) -> String {
    to_hex(bytes)
}

#[must_use]
pub fn to_hex20(bytes: &[u8; ADDRESS_SIZE]) -> String {
    to_hex(bytes)
}

/// Checks that required Merkle database files exist.
///
/// # Errors
/// Returns an error if addresses.bin or layer00.bin is missing.
pub fn ensure_db_present(db_dir: &Path) -> Result<(), MerkleError> {
    let addresses = db_dir.join("addresses.bin");
    if !addresses.exists() {
        return Err(MerkleError::MissingLayer(format!(
            "Missing addresses file at {}",
            addresses.display()
        )));
    }

    let first_layer = db_dir.join("layer00.bin");
    if !first_layer.exists() {
        return Err(MerkleError::MissingLayer(format!(
            "Missing first layer file at {} (expected layer00.bin)",
            first_layer.display()
        )));
    }

    Ok(())
}

pub fn available_layers(db_dir: &Path) -> Vec<PathBuf> {
    let mut layers = Vec::new();
    for idx in 0usize..=64 {
        let filename = format!("layer{:02}.bin", idx);
        let path = db_dir.join(filename);
        if path.exists() {
            layers.push(path);
        } else {
            break;
        }
    }
    layers
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sibling_side() {
        assert_eq!(SiblingSide::Left.as_str(), "left");
        assert_eq!(SiblingSide::Right.as_str(), "right");
        assert!(SiblingSide::Left.proof_flag());
        assert!(!SiblingSide::Right.proof_flag());
    }

    #[test]
    fn test_parse_address_with_0x() {
        let result = parse_address("0x1234567890123456789012345678901234567890");
        assert!(result.is_ok());
        let addr = result.unwrap();
        assert_eq!(
            addr,
            [
                0x12, 0x34, 0x56, 0x78, 0x90, 0x12, 0x34, 0x56, 0x78, 0x90, 0x12, 0x34, 0x56, 0x78,
                0x90, 0x12, 0x34, 0x56, 0x78, 0x90
            ]
        );
    }

    #[test]
    fn test_parse_address_without_prefix() {
        let result = parse_address("1234567890123456789012345678901234567890");
        assert!(result.is_ok());
    }

    #[test]
    fn test_parse_address_too_short() {
        let result = parse_address("0x1234");
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("40 hex"));
    }

    #[test]
    fn test_parse_address_invalid_hex() {
        let result = parse_address("0x123456789012345678901234567890123456789g");
        assert!(result.is_err());
        let err_msg = result.unwrap_err().to_string();
        assert!(err_msg.contains("Invalid hex"));
    }

    #[test]
    fn test_normalize_hex() {
        assert_eq!(normalize_hex("0x1234"), "0x1234");
        assert_eq!(normalize_hex("1234"), "0x1234");
        assert_eq!(normalize_hex("0X1234"), "0x1234");
    }

    #[test]
    fn test_hash_leaf() {
        let address = [0u8; ADDRESS_SIZE];
        let hash = hash_leaf(&address);
        assert_eq!(hash.len(), HASH_SIZE);
        let different_address = [1u8; ADDRESS_SIZE];
        let different_hash = hash_leaf(&different_address);
        assert_ne!(hash, different_hash);
    }

    #[test]
    fn test_to_hex32() {
        let bytes = [0x01, 0x02, 0x03, 0x04u8];
        let mut full_bytes = [0u8; HASH_SIZE];
        full_bytes[0..4].copy_from_slice(&bytes);
        let hex = to_hex32(&full_bytes);
        assert!(hex.starts_with("0x"));
        assert_eq!(hex.len(), 66);
    }

    #[test]
    fn test_to_hex20() {
        let bytes = [0x01, 0x02, 0x03, 0x04u8];
        let mut full_bytes = [0u8; ADDRESS_SIZE];
        full_bytes[0..4].copy_from_slice(&bytes);
        let hex = to_hex20(&full_bytes);
        assert!(hex.starts_with("0x"));
        assert_eq!(hex.len(), 42);
    }

    #[test]
    fn test_layer_node_count_invalid_file() {
        let result = layer_node_count(Path::new("/nonexistent/path"));
        assert!(result.is_err());
    }
}
