use std::env;
use std::path::Path;
use std::process;

use merklebuilder::merkle::{build_proof, to_hex32};

fn main() {
    let address_str = match parse_args() {
        Ok(v) => v,
        Err(e) => {
            eprintln!("{e}");
            eprintln!(
                "Usage: {} <address>",
                env::args()
                    .next()
                    .unwrap_or_else(|| "merkle_path".to_string())
            );
            process::exit(1);
        }
    };

    let db_dir = std::env::var("MERKLE_DB_DIR").unwrap_or_else(|_| "merkledb".to_string());
    let db_dir = Path::new(&db_dir);
    match build_proof(db_dir, &address_str) {
        Ok(proof) => {
            println!("Address: {}", proof.normalized_address);
            println!(
                "Found in addresses.bin at index {} ({} total, {} lookups)",
                proof.index, proof.total, proof.lookups
            );
            println!("Leaf hash: {}", to_hex32(&proof.leaf));

            for step in &proof.steps {
                println!(
                    "Layer {:02} sibling ({}): idx {} -> {}",
                    step.level,
                    step.side.as_str(),
                    step.sibling_index,
                    to_hex32(&step.sibling_hash)
                );
            }

            println!(
                "Root (layer {:02}): {}",
                proof.root_level,
                to_hex32(&proof.root)
            );
        }
        Err(e) => {
            eprintln!("Error: {e}");
            process::exit(1);
        }
    }
}

fn parse_args() -> Result<String, String> {
    let mut args = env::args().skip(1);
    let address = args
        .next()
        .ok_or_else(|| "Missing required argument: address".to_string())?;

    if args.next().is_some() {
        return Err("Too many arguments provided".to_string());
    }

    Ok(address)
}
