use std::env;
use std::fs::File;
use std::io::{BufWriter, Write};
use std::process;

use k256::SecretKey;
use k256::elliptic_curve::rand_core::SeedableRng;
use rand_chacha::ChaCha20Rng;
use serde::Serialize;
use sha3::{Digest, Keccak256};
use k256::elliptic_curve::sec1::ToEncodedPoint;

#[derive(Serialize)]
struct TestAccount {
    address: String,
    private_key: String,
}

fn main() {
    let (count, output_path, seed) = match parse_args() {
        Ok(values) => values,
        Err(e) => {
            eprintln!("{e}");
            eprintln!(
                "Usage: {} --count <n> --output <file> [--seed <n>]",
                env::args()
                    .next()
                    .unwrap_or_else(|| "generate-test-accounts".to_string())
            );
            process::exit(1);
        }
    };

    if let Err(err) = generate_accounts(count, &output_path, seed) {
        eprintln!("Error: {err}");
        process::exit(1);
    }

    println!("✓ Generated {} test accounts to {}", count, output_path);
    println!("  Seed: {} (deterministic)", seed);
}

fn parse_args() -> Result<(usize, String, u64), String> {
    let args: Vec<String> = env::args().collect();
    let mut count: Option<usize> = None;
    let mut output: Option<String> = None;
    let mut seed: u64 = 42; // Default seed

    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "--count" | "-c" => {
                i += 1;
                if i >= args.len() {
                    return Err("--count requires a value".to_string());
                }
                count = Some(
                    args[i]
                        .parse()
                        .map_err(|_| "Invalid count value".to_string())?,
                );
            }
            "--output" | "-o" => {
                i += 1;
                if i >= args.len() {
                    return Err("--output requires a value".to_string());
                }
                output = Some(args[i].clone());
            }
            "--seed" | "-s" => {
                i += 1;
                if i >= args.len() {
                    return Err("--seed requires a value".to_string());
                }
                seed = args[i]
                    .parse()
                    .map_err(|_| "Invalid seed value".to_string())?;
            }
            other => return Err(format!("Unknown argument: {other}")),
        }
        i += 1;
    }

    let count = count.ok_or_else(|| "Missing required --count argument".to_string())?;
    let output = output.ok_or_else(|| "Missing required --output argument".to_string())?;

    if count == 0 {
        return Err("Count must be greater than zero".to_string());
    }

    Ok((count, output, seed))
}

fn generate_accounts(count: usize, output_path: &str, seed: u64) -> Result<(), Box<dyn std::error::Error>> {
    let mut rng = ChaCha20Rng::seed_from_u64(seed);
    let mut accounts = Vec::with_capacity(count);

    for _ in 0..count {
        let secret_key = SecretKey::random(&mut rng);
        let address = ethereum_address(&secret_key);
        let private_key = format!("0x{}", hex::encode(secret_key.to_bytes()));

        accounts.push(TestAccount {
            address,
            private_key,
        });
    }

    // Write as JSON
    let file = File::create(output_path)?;
    let writer = BufWriter::new(file);
    serde_json::to_writer_pretty(writer, &accounts)?;

    Ok(())
}

fn ethereum_address(secret_key: &SecretKey) -> String {
    let public_key = secret_key.public_key();
    let encoded = public_key.to_encoded_point(false);
    let public_bytes = encoded.as_bytes();

    let hash = Keccak256::digest(&public_bytes[1..]);
    let address_bytes = &hash[hash.len() - 20..];
    to_checksum_address(address_bytes)
}

fn to_checksum_address(address: &[u8]) -> String {
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
