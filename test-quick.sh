#!/bin/bash
# Quick test without keeping services running
cd /home/riddler/merklebuilder
./test-suite/scripts/run-full-cycle.sh 10 &
PID=$!

# Wait max 2 minutes
for i in {1..120}; do
    if ! ps -p $PID > /dev/null; then
        echo "Script completed"
        break
    fi
    sleep 1
    if [ $i -eq 120 ]; then
        echo "Timeout - killing script"
        kill $PID
    fi
done
