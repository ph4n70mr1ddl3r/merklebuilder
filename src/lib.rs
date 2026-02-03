use k256::elliptic_curve::sec1::ToEncodedPoint;
use k256::SecretKey;
use sha3::{Digest, Keccak256};

pub mod merkle;

pub fn ethereum_address(secret_key: &SecretKey) -> String {
    let public_key = secret_key.public_key();
    let encoded = public_key.to_encoded_point(false);
    let public_bytes = encoded.as_bytes();

    let hash = Keccak256::digest(&public_bytes[1..]);
    let address_bytes = &hash[hash.len() - 20..];
    to_checksum_address(address_bytes)
}

pub fn to_checksum_address(address: &[u8]) -> String {
    let mut hex = String::with_capacity(40);
    for byte in address {
        hex.push_str(&format!("{:02x}", byte));
    }

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
