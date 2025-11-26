use std::env;
use std::fs::File;
use std::io::{BufWriter, Write};
use std::process;

use indicatif::{ProgressBar, ProgressStyle};
use k256::SecretKey;
use k256::elliptic_curve::rand_core::OsRng;
use k256::elliptic_curve::sec1::ToEncodedPoint;
use sha3::{Digest, Keccak256};

fn main() {
    let (count, output_path) = match parse_args() {
        Ok(values) => values,
        Err(message) => {
            eprintln!("{message}");
            eprintln!(
                "Usage: {} <number_of_addresses> <output_file>",
                env::args()
                    .next()
                    .unwrap_or_else(|| "address-generator".to_string())
            );
            process::exit(1);
        }
    };

    if let Err(err) = write_addresses(count, &output_path) {
        eprintln!("Error: {err}");
        process::exit(1);
    }
}

fn parse_args() -> Result<(usize, String), String> {
    let mut args = env::args().skip(1);
    let count_raw = args
        .next()
        .ok_or_else(|| "Missing required argument: number of addresses".to_string())?;
    let output_path = args
        .next()
        .ok_or_else(|| "Missing required argument: output file".to_string())?;

    if args.next().is_some() {
        return Err("Too many arguments provided".to_string());
    }

    let count: usize = count_raw
        .parse()
        .map_err(|_| "Number of addresses must be a positive integer".to_string())?;

    if count == 0 {
        return Err("Number of addresses must be greater than zero".to_string());
    }

    Ok((count, output_path))
}

fn write_addresses(count: usize, output_path: &str) -> Result<(), Box<dyn std::error::Error>> {
    let file = File::create(output_path)?;
    let mut writer = BufWriter::new(file);
    let mut rng = OsRng;
    let progress = build_progress(count as u64);
    let update_every = progress_update_interval(count);

    for idx in 0..count {
        let secret_key = SecretKey::random(&mut rng);
        let address = ethereum_address(&secret_key);
        writer.write_all(address.as_bytes())?;
        writer.write_all(b"\n")?;

        let written = idx + 1;
        if written % update_every == 0 || written == count {
            progress.set_position(written as u64);
        }
    }

    writer.flush()?;
    progress.finish_and_clear();
    println!("Wrote {count} addresses to {output_path}");
    Ok(())
}

fn progress_update_interval(count: usize) -> usize {
    // Update roughly every 1% but not more frequently than every 1,000 items.
    let one_percent = (count / 100).max(1);
    one_percent.clamp(1_000, usize::MAX)
}

fn build_progress(len: u64) -> ProgressBar {
    let bar = ProgressBar::new(len);
    let style = ProgressStyle::with_template(
        "{spinner:.green} [{elapsed_precise}] [{wide_bar:.cyan/blue}] {pos}/{len} ({percent}%)",
    )
    .unwrap_or_else(|_| ProgressStyle::default_bar())
    .progress_chars("#>- ");
    bar.set_style(style);
    bar
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
