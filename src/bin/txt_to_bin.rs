use std::env;
use std::fs::{create_dir_all, File};
use std::io::{BufRead, BufReader, BufWriter, Write};
use std::path::{Path, PathBuf};
use std::process;

use indicatif::{ProgressBar, ProgressStyle};

use merklebuilder::merkle::{hash_leaf, parse_address};
use merklebuilder::{ADDRESS_SIZE, HASH_SIZE};

fn main() {
    let (input, output_dir) = match parse_args() {
        Ok(v) => v,
        Err(e) => {
            eprintln!("{e}");
            eprintln!(
                "Usage: {} <input_txt> [output_dir (default: merkledb)]",
                env::args()
                    .next()
                    .unwrap_or_else(|| "txt_to_bin".to_string())
            );
            process::exit(1);
        }
    };

    if let Err(e) = convert_file(&input, &output_dir) {
        eprintln!("Error: {e}");
        process::exit(1);
    }
}

fn parse_args() -> Result<(String, String), String> {
    let mut args = env::args().skip(1);
    let input = args
        .next()
        .ok_or_else(|| "Missing required argument: input file".to_string())?;
    let output_dir = args.next().unwrap_or_else(|| "merkledb".to_string());

    if args.next().is_some() {
        return Err("Too many arguments provided".to_string());
    }

    Ok((input, output_dir))
}

fn convert_file(input_path: &str, output_dir: &str) -> Result<(), Box<dyn std::error::Error>> {
    let total = count_non_empty_lines(input_path)?;
    if total == 0 {
        return Err("Input file contained no addresses".into());
    }

    let file = File::open(input_path)?;
    let reader = BufReader::new(file);
    let progress = build_progress(total as u64);
    let update_every = progress_update_interval(total);

    let mut addresses = Vec::new();
    for (idx, line) in reader.lines().enumerate() {
        let line = line?;
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        let addr = parse_address(trimmed).map_err(|e| format!("Line {}: {}", idx + 1, e))?;
        addresses.push(addr);

        let processed = addresses.len();
        if processed % update_every == 0 || processed == total {
            progress.set_position(processed as u64);
        }
    }

    addresses.sort();
    addresses.dedup();

    let out_dir = PathBuf::from(output_dir);
    create_dir_all(&out_dir)?;

    let addresses_path = out_dir.join("addresses.bin");
    write_addresses(&addresses_path, &addresses)?;

    let leaves: Vec<[u8; HASH_SIZE]> = addresses.iter().map(hash_leaf).collect();
    let layers = build_layers(leaves)?;
    write_layers(&out_dir, &layers)?;

    progress.finish_and_clear();
    let root_hex = layers
        .last()
        .and_then(|l| l.first())
        .map(hex::encode)
        .ok_or("Failed to get root hash")?;
    println!(
        "Wrote {} unique addresses ({}-byte each) to {}",
        addresses.len(),
        ADDRESS_SIZE,
        addresses_path.display()
    );
    println!(
        "Built {} Merkle layers (root: 0x{}) into {}",
        layers.len(),
        root_hex,
        out_dir.display()
    );
    Ok(())
}

fn write_addresses(
    path: &PathBuf,
    addresses: &[[u8; ADDRESS_SIZE]],
) -> Result<(), Box<dyn std::error::Error>> {
    let out_file = File::create(path)?;
    let mut writer = BufWriter::new(out_file);
    for addr in addresses {
        writer.write_all(addr)?;
    }
    writer.flush()?;
    Ok(())
}

fn write_layers(dir: &Path, layers: &[Vec<[u8; HASH_SIZE]>]) -> Result<(), Box<dyn std::error::Error>> {
    for (idx, layer) in layers.iter().enumerate() {
        let filename = format!("layer{:02}.bin", idx);
        let path = dir.join(filename);
        let mut writer = BufWriter::new(File::create(path)?);
        for node in layer {
            writer.write_all(node)?;
        }
        writer.flush()?;
    }
    Ok(())
}

use sha3::{Digest, Keccak256};

fn hash_pair(left: &[u8; HASH_SIZE], right: &[u8; HASH_SIZE]) -> [u8; HASH_SIZE] {
    let mut hasher = Keccak256::new();
    hasher.update(left);
    hasher.update(right);
    hasher.finalize().into()
}

fn build_layers(
    mut current: Vec<[u8; HASH_SIZE]>,
) -> Result<Vec<Vec<[u8; HASH_SIZE]>>, Box<dyn std::error::Error>> {
    if current.is_empty() {
        return Err("Cannot build tree from empty leaf set".into());
    }

    let mut layers = Vec::new();
    layers.push(current.clone());

    // Single leaf becomes its own root
    if current.len() == 1 {
        return Ok(layers);
    }

    let total_hashes = total_hash_ops(current.len());

    // Only show progress bar for larger datasets
    let show_progress = total_hashes >= 100;
    let progress = if show_progress {
        Some(build_progress(total_hashes as u64))
    } else {
        None
    };

    let update_every = if show_progress {
        progress_update_interval(total_hashes)
    } else {
        usize::MAX // Never update
    };

    let mut done = 0usize;

    while current.len() > 1 {
        let mut next = Vec::with_capacity(current.len().div_ceil(2));
        for chunk in current.chunks(2) {
            let right = if chunk.len() == 2 { chunk[1] } else { chunk[0] };
            next.push(hash_pair(&chunk[0], &right));
            done = done.saturating_add(1);
            if let Some(ref p) = progress
                && (done.is_multiple_of(update_every) || done == total_hashes)
            {
                p.set_position(done as u64);
            }
        }
        layers.push(next.clone());
        current = next;
    }

    if let Some(p) = progress {
        p.finish_and_clear();
    }

    Ok(layers)
}

fn total_hash_ops(mut count: usize) -> usize {
    let mut total = 0usize;
    while count > 1 {
        let hashes = count.div_ceil(2);
        total = total.saturating_add(hashes);
        count = hashes;
    }
    total
}

fn count_non_empty_lines(path: &str) -> Result<usize, Box<dyn std::error::Error>> {
    let file = File::open(path)?;
    let reader = BufReader::new(file);
    let mut count = 0usize;
    for line in reader.lines() {
        let line = line?;
        if !line.trim().is_empty() {
            count = count.saturating_add(1);
        }
    }
    Ok(count)
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

fn progress_update_interval(count: usize) -> usize {
    // Update roughly every 1% but not more frequently than every 100 items.
    // This allows progress for smaller datasets while not spamming on large ones.
    let one_percent = (count / 100).max(1);
    one_percent.clamp(100, usize::MAX)
}
