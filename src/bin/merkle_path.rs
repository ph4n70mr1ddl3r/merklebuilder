use std::cmp::Ordering;
use std::env;
use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::path::Path;
use std::process;

use sha3::{Digest, Keccak256};

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

    match print_merkle_path(&address_str) {
        Ok(()) => {}
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

fn print_merkle_path(address_str: &str) -> Result<(), Box<dyn std::error::Error>> {
    let address = parse_address(address_str)?;
    let db_dir = Path::new("merkledb");
    let addresses_path = db_dir.join("addresses.bin");
    let (index, steps, total) =
        find_address_index(&addresses_path, &address)?.ok_or_else(|| {
            "Address not found in addresses.bin (ensure file is sorted and matches input)"
                .to_string()
        })?;

    let leaf_hash = hash_leaf(&address);

    println!("Address: {}", normalize_hex(address_str));
    println!(
        "Found in addresses.bin at index {} ({} total, {} lookups)",
        index, total, steps
    );
    println!("Leaf hash: 0x{}", hex::encode(leaf_hash));

    let mut level = 0usize;
    let mut path_index = index;
    loop {
        let filename = format!("layer{:02}.bin", level);
        let layer_path = db_dir.join(filename);
        if !layer_path.exists() {
            if level == 0 {
                return Err("No layer files found (expected layer00.bin, layer01.bin, ...)".into());
            }
            return Err(format!(
                "Missing layer file for level {} (expected {})",
                level,
                layer_path.display()
            )
            .into());
        }

        let node_count = layer_node_count(&layer_path)?;
        if node_count == 0 {
            return Err(format!("Layer {:02} is empty", level).into());
        }
        if path_index >= node_count {
            return Err(format!(
                "Layer {:02} length {} too small for index {}",
                level, node_count, path_index
            )
            .into());
        }

        if node_count == 1 {
            let root = read_node(&layer_path, 0)?;
            println!("Root (layer {:02}): 0x{}", level, hex::encode(root));
            break;
        }

        let is_left = path_index % 2 == 0;
        let sibling_idx = if is_left {
            if path_index + 1 < node_count {
                path_index + 1
            } else {
                path_index
            }
        } else {
            path_index - 1
        };

        let sibling_hash = read_node(&layer_path, sibling_idx)?;
        let side = if is_left { "right" } else { "left" };
        println!(
            "Layer {:02} sibling ({side}): idx {} -> 0x{}",
            level,
            sibling_idx,
            hex::encode(sibling_hash)
        );

        path_index /= 2;
        level += 1;
    }

    Ok(())
}

fn parse_address(raw: &str) -> Result<[u8; 20], String> {
    let cleaned = raw
        .strip_prefix("0x")
        .or_else(|| raw.strip_prefix("0X"))
        .unwrap_or(raw);
    if cleaned.len() != 40 {
        return Err("Address must be 40 hex characters after 0x".to_string());
    }

    let mut buf = [0u8; 20];
    hex::decode_to_slice(cleaned, &mut buf).map_err(|_| "Invalid hex in address".to_string())?;
    Ok(buf)
}
fn normalize_hex(raw: &str) -> String {
    if raw.starts_with("0x") || raw.starts_with("0X") {
        raw.to_string()
    } else {
        format!("0x{raw}")
    }
}

fn hash_leaf(address: &[u8; 20]) -> [u8; 32] {
    let mut hasher = Keccak256::new();
    hasher.update(address);
    hasher.finalize().into()
}

fn layer_node_count(path: &Path) -> Result<usize, Box<dyn std::error::Error>> {
    let len = File::open(path)?.metadata()?.len();
    if len % 32 != 0 {
        return Err(format!(
            "Layer file {} is not a multiple of 32 bytes ({len})",
            path.display()
        )
        .into());
    }
    Ok((len / 32) as usize)
}

fn read_node(path: &Path, index: usize) -> Result<[u8; 32], Box<dyn std::error::Error>> {
    let mut file = File::open(path)?;
    file.seek(SeekFrom::Start((index as u64) * 32))?;
    let mut buf = [0u8; 32];
    file.read_exact(&mut buf)?;
    Ok(buf)
}

fn find_address_index(
    path: &Path,
    target: &[u8; 20],
) -> Result<Option<(usize, usize, usize)>, Box<dyn std::error::Error>> {
    let mut file = File::open(path)?;
    let len = file.metadata()?.len();
    if len % 20 != 0 {
        return Err(format!("addresses.bin is not a multiple of 20 bytes ({len})").into());
    }
    let total = (len / 20) as usize;
    if total == 0 {
        return Ok(None);
    }

    let mut low = 0usize;
    let mut high = total;
    let mut buf = [0u8; 20];
    let mut steps = 0usize;

    while low < high {
        let mid = (low + high) / 2;
        file.seek(SeekFrom::Start((mid as u64) * 20))?;
        file.read_exact(&mut buf)?;
        steps = steps.saturating_add(1);
        match buf.cmp(target) {
            Ordering::Less => {
                low = mid + 1;
            }
            Ordering::Greater => {
                high = mid;
            }
            Ordering::Equal => return Ok(Some((mid, steps, total))),
        }
    }

    Ok(None)
}
