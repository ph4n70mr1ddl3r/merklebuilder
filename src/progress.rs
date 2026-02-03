use indicatif::{ProgressBar, ProgressStyle};

pub fn build_progress(len: u64) -> ProgressBar {
    let bar = ProgressBar::new(len);
    let style = ProgressStyle::with_template(
        "{spinner:.green} [{elapsed_precise}] [{wide_bar:.cyan/blue}] {pos}/{len} ({percent}%)",
    )
    .unwrap_or_else(|_| ProgressStyle::default_bar())
    .progress_chars("#>- ");
    bar.set_style(style);
    bar
}

pub fn progress_update_interval(count: usize) -> usize {
    if count < 1_000 {
        return count.max(1);
    }
    let one_percent = (count / 100).max(1);
    one_percent.clamp(1_000, 100_000)
}
