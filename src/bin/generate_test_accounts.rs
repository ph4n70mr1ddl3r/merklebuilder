use std::env;
use std::fs::File;
use std::io::BufWriter;
use std::process;

use k256::elliptic_curve::rand_core::SeedableRng;
use k256::SecretKey;
use merklebuilder::ethereum_address;
use rand_chacha::ChaCha20Rng;
use serde::Serialize;

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

fn generate_accounts(
    count: usize,
    output_path: &str,
    seed: u64,
) -> Result<(), Box<dyn std::error::Error>> {
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
