import subprocess
import sys

if __name__ == "__main__":
    print("Starting hot-reload server on port 5174 (http://localhost:5174)...")
    try:
        subprocess.run(["npx", "live-server", "--port=5174", "--no-browser", "--ignore=data"], check=True)
    except KeyboardInterrupt:
        print("Dev server stopped.")
    except Exception as e:
        print(f"Error running live-server: {e}")
