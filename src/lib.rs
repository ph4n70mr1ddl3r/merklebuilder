use k256::elliptic_curve::sec1::ToEncodedPoint;
use k256::SecretKey;
use sha3::{Digest, Keccak256};

pub mod merkle;
pub mod progress;

pub const ADDRESS_SIZE: usize = 20;
pub const HASH_SIZE: usize = 32;
pub const ADDRESS_HEX_LENGTH: usize = 40;

#[must_use]
pub fn ethereum_address(secret_key: &SecretKey) -> String {
    let public_key = secret_key.public_key();
    let encoded = public_key.to_encoded_point(false);
    let public_bytes = encoded.as_bytes();

    let hash = Keccak256::digest(&public_bytes[1..]);
    let address_bytes = &hash[hash.len() - 20..];
    to_checksum_address(address_bytes)
}

#[must_use]
pub fn to_checksum_address(address: &[u8]) -> String {
    let hex = hex::encode(address);
    let hash = Keccak256::digest(hex.as_bytes());
    let mut checksummed = String::with_capacity(42);
    checksummed.push_str("0x");

    for (i, ch) in hex.chars().enumerate() {
        let hash_byte = hash[i / 2];
        let hash_nibble = if i % 2 == 0 {
            hash_byte >> 4
        } else {
            hash_byte & 0x0f
        };

        if ch.is_ascii_digit() || hash_nibble < 8 {
            checksummed.push(ch.to_ascii_lowercase());
        } else {
            checksummed.push(ch.to_ascii_uppercase());
        }
    }

    checksummed
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_address_valid() {
        let result = merkle::parse_address("0x1234567890123456789012345678901234567890");
        assert!(result.is_ok());
        let addr = result.unwrap();
        assert_eq!(addr.len(), ADDRESS_SIZE);
    }

    #[test]
    fn test_parse_address_no_prefix() {
        let result = merkle::parse_address("1234567890123456789012345678901234567890");
        assert!(result.is_ok());
    }

    #[test]
    fn test_parse_address_invalid_length() {
        let result = merkle::parse_address("0x1234");
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_address_invalid_hex() {
        let result = merkle::parse_address("0xzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz");
        assert!(result.is_err());
    }

    #[test]
    fn test_normalize_hex() {
        assert_eq!(merkle::normalize_hex("0x1234"), "0x1234");
        assert_eq!(merkle::normalize_hex("1234"), "0x1234");
        assert_eq!(merkle::normalize_hex("0X1234"), "0x1234");
    }

    #[test]
    fn test_hash_leaf() {
        let address = [0u8; ADDRESS_SIZE];
        let hash = merkle::hash_leaf(&address);
        assert_eq!(hash.len(), HASH_SIZE);
    }

    #[test]
    fn test_to_hex32() {
        let bytes = [0u8; HASH_SIZE];
        let hex = merkle::to_hex32(&bytes);
        assert!(hex.starts_with("0x"));
        assert_eq!(hex.len(), 2 + HASH_SIZE * 2);
    }

    #[test]
    fn test_to_hex20() {
        let bytes = [0u8; ADDRESS_SIZE];
        let hex = merkle::to_hex20(&bytes);
        assert!(hex.starts_with("0x"));
        assert_eq!(hex.len(), 2 + ADDRESS_SIZE * 2);
    }
}
