use std::env;
use std::fs::File;
use std::io::{BufWriter, Write};
use std::process;

use k256::elliptic_curve::rand_core::OsRng;
use k256::SecretKey;
use merklebuilder::ethereum_address;
use merklebuilder::progress::{build_progress, progress_update_interval};

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
