import os
import time
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from pathlib import Path

# ============================================================================
# ⚙️ CONFIGURATION
# ============================================================================
# Email Configuratie
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SENDER_EMAIL = "avdocumentenhirb@gmail.com"
SENDER_PASSWORD = "hjri xnha kklc vekj"  # Use App Password for Gmail
RECIPIENT_EMAIL = "alexanderverstraete1@gmail.com"

# Dropbox Configuratie
DROPBOX_ACCESS_TOKEN = "sl.u.AGOTkaKHDXOG0Gzc8zhRZqlWuDHWNqWVA2sE7ET-aA5EBkeWrgA_hH_i70A4THpsBM-P-KhbLLreYMYbvcaOFIzQB8sIhuZrpi2HOufxN_jRAQCQHsDwHu9jibHcGTQk-PFCes-zGcNflJMZ8s2Dgzx0hgI9L1k_H7fqvC5oO99J99LwGM91tFMZIpv5Vfyh3DXUZTcP2zrUmuCgXVyHJaj3BVyvbpaTO7COT-OiBB8Y7soEwJgzmt7z4aOsGKE6ShUEOaTbgTTcV6SBQQ100_vCzCJsZXiAEHK3D3aWgppHPPO0srPNOPITBSMV_PsPzkXdXjjnpWHhOuLU7f1JqW1nVKmHSTBS-Sb85Jor1VFE4o4xUCct_pZYUoq0rGtT8cv8jHjWyUZK1KYBsvfhDaRwiKcHkqQXmPPxIMinBu9NifV14d0rCe9gdp2JWLYdTPw8gOrlIPoQFqWf7fx-yFtq5cEuNaQ2BAdAn9ySbvsu9NCi3E0mPiABrDQoj9YjIA4eq_bHgecaDvqHg-MyaQ3FIZJnhhbetQlHKq5X47Jrr-quiCYiYjQn8gmvn3M3uVgZ6jD5civDMQeYadkrCGgrkkRUVYcTya34Olm2DVZjx0Q3Ao4NGR6-i07XBLtsmph0_1qKX3xFSfUIyrNXPnlZ1b7h4yp0S5L2Z7DCZVZX7mYwxLuj27ia0DiC8URUF8Mhbh203W7kGvGDs3AB0EedAxl2N3S7S8OE4latCQbBYvQbguH3CSlasDqElG2XwBb8bAPMJ0OZQ6yJ2RqvJOcgNtDX73zJwrLTpPY3gzhPgKRg0eKB3b7dmr01DcFqWoA7vATxiqSMcDKAMUq2o1TWhvr_tF2YZaVvfb8bfLUcSc4Mejf1hGMd4pcI6RmZebLMC1QQuuOfG_DjoQp1zC7sOaNwnqUxRE01TKCde2NJpJfjGS21A5gjR6_c9AHXJGuCZ6Lae6l2j4fzOxvX7fp88_xLseu_TkrnJqBBA3pTB4mYNt4mY_x7Rt_za_v94_UDK6eJaug8R-QpO3jfIiSaSXGhIPjL31bEp6cqSTNL4QCF3oXMGXGJexv7trBhMcyf3KEK4VGDqW_VM-3_bhvS8O028uIZqgB3KuqNQDKfD6w7DkLTwOWpPGsRgLMdCY6dl7_8PWutYo5jT58hFFsfWTxvP2n1rbP1czdo7f6IVjHqFzoHhL84r9N0Awhn_T-QMDiLtHV1iiX9PactH49Fs6ezCKFGVK-_8Zmsv1uSzO8YUGk_5QfXpjbveHIJtP_UwUC_QE39IY1ji_ZLRTeqo9a_u621fFniAAg9HWXgBwLt64zO1E9lsipRp0amhsDo0xXhdD5q8iBFJQz0C5abYPIUzo_uGaq9CIPkLjcZsUDdqlfwjyIxPQeFVlXnLHryOrpaGcs-ZnRDYNpn9_6w-bF96sGaw5wlVrLHkYNs8eu48XDemcAvlxQbJKHxy8w"
DROPBOX_FOLDER = ""  # ← Laat leeg voor hele Dropbox, of bijv. "/Documenten"
# Email Configuration
SMTP_SERVER = "smtp.gmail.com"  # Change for your email provider
SMTP_PORT = 587
SENDER_EMAIL = "avdocumentenhirb@gmail.com"
SENDER_PASSWORD = "hjri xnha kklc vekj"  # Use App Password for Gmail
RECIPIENT_EMAIL = "alexanderverstraete1@gmail.com"

# Monitor Configuration
MONITOR_PATH = "/path/to/monitor"  # Folder to monitor
FILE_EXTENSIONS = ['.pdf', '.docx', '.txt']  # File types to watch
CHECK_INTERVAL = 30  # Seconds between checks
HISTORY_FILE = "monitored_files.txt"
'sl.u.AGOtJQDOkoaPjeFh69uHxWkBSO2r6I-zSPwyeIsL4ZG6y-VTURfZTjL5a0lmMuyTWMZzHqQEMDUroIP0lxzod32dHO9MHoG1FooYN5MzV4LWDMCdohdQNC8vkS1ea0jN5kbVtounf76TaiCH58SKcNBD9LyW032AZNVDZqioP-InQAec79d_016a1nsoNYLVr_rz-avDfE8hjfp_7wS4FIcUQvHtK9Q-Ko0hqecfabwt9lRtZforB6ClqL2r1Y0Z5XD-PFYNE1vTuRtaalelHMlwdkx1JeSSc-6i0FxYHJyPr7MuXU11LsLjvIWl-ZYk2rymWSJZTpHMk_iqJcCWZfr3g6YM31QsCY--JBP0eEzQeo3UcrcAY5s7MLp1VghKQgwX_lyitMnnCS0lukQGkoyoTcf4qFOXd4nWip-v3gjNC1R7zXSTJ01yFZGzuMNNTap5LVYvjrVvD5C875V6Vt4RuwsBxUaOwaJ4aWsi1BSs1e6eOTPr4JwwoSRfw52xDc28ggmCHfW_D9LWjzkj9tFum1uOe3ZxP8bYG88vvanjh9qzoZeeU4QtV2CEdzTriJRwZPrkdRWHtHb7dV6_OT-vojBj64W8aOHj5E220Bf0AMeMEJ-UW4v0NMFv6MuS0MZqc43YCz1dlKnpatIInaHg3ab38M7iPVEO5qdvwGwv3tpCe3PHx0PmmSOZ_kQnqscp3DCjq7ccLlQERQkbWmz3Cb3fhEe-aWZe9WvKihuv6lixfJWwZy0GUMdYpVwp8q9Pss49ZP-wJzs9tnuxScsw5vveusZciXuqGVZO1GkseItXalf0Mlfizxxi_qs7eCxokCmI3tRGeYDRcipe8w2eCdqrRhq_acC35CcF_jfXHgH9qUNhZcG4KjWAMDKawaVWvjG_3SqihmemAWQQsOLC5kSyi3j6NY7Jt2OQUTOxv8hf681AUQ7Dcb_FBn6yxjp6BNg49_odDJLP0UdiL1K3OXptl5tiUuRYinyA-CmoTCv6Wsbb38DROF3-k_aZM85AmQdjw1YuimFVmShUPTvIZCwnJmR2DFKfp6Ln2hT-uuRi-u4QtiTkpnd9-cfxALE_dkjxGrzUC-9NnJD46-UmRTfLMv9ZfnLhmDRQJAKLIjTTYqkB2C7yvD3vsVBB3upnzCQBDq8YGwj7bALtyUoldX24UIKeHDroE0488D-wcyb_yBL1FvBf8i6NGy_gDNlkVm9nRlhSy1jHovgMxW-JNBusWpnmRNEnhtYiVKW73xt8EBbeDN46Qrg0Ve5ZwSAJpYZuoqL_8jWzCcvvofItf_7Cztmvaqmok1kBxKcwV-XtGjcHGCv0WoFFTWcNUNH_LNsxBT85iMbra9pdwHK2oNz9QowVQKWZjqrxDchDzrHWSo0JZezZzbNZVe9b5B5zLKUAQcWxi5u_hY0xg9fWbl_K8jn395sJNImj7i84miPGNcQ8J3BOQ2OSwZsyYuY'


# ============================================================================
# 📧 EMAIL FUNCTIONS
# ============================================================================

def send_email(subject, body, file_path=None):
    """Send email notification about new file"""
    try:
        msg = MIMEMultipart()
        msg['From'] = SENDER_EMAIL
        msg['To'] = RECIPIENT_EMAIL
        msg['Subject'] = subject

        msg.attach(MIMEText(body, 'plain'))

        # Connect and send
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.send_message(msg)

        print(f"✅ Email sent: {subject}")
        return True

    except Exception as e:
        print(f"❌ Email error: {e}")
        return False


# ============================================================================
# 📁 FILE MONITORING
# ============================================================================

def load_history():
    """Load previously detected files"""
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            return set(f.read().splitlines())
    return set()


def save_to_history(file_path):
    """Save file to history"""
    with open(HISTORY_FILE, "a", encoding="utf-8") as f:
        f.write(file_path + "\n")


def get_file_info(file_path):
    """Get file metadata"""
    stat = os.stat(file_path)
    return {
        'name': os.path.basename(file_path),
        'size': stat.st_size,
        'modified': datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d %H:%M:%S'),
        'path': file_path
    }


def scan_for_new_files():
    """Scan directory for new files"""
    history = load_history()
    new_files = []

    try:
        for root, dirs, files in os.walk(MONITOR_PATH):
            for filename in files:
                # Check if file matches criteria
                if any(filename.lower().endswith(ext) for ext in FILE_EXTENSIONS):
                    full_path = os.path.join(root, filename)

                    if full_path not in history:
                        new_files.append(full_path)

        return new_files

    except Exception as e:
        print(f"⚠️ Scan error: {e}")
        return []


# ============================================================================
# 🚀 MAIN MONITOR LOOP
# ============================================================================

def monitor_files():
    """Main monitoring loop"""
    print(f"\n🚀 File monitor started")
    print(f"📁 Watching: {MONITOR_PATH}")
    print(f"📧 Notifications to: {RECIPIENT_EMAIL}")
    print(f"⏱️  Check interval: {CHECK_INTERVAL} seconds")
    print("Press Ctrl+C to stop\n")

    while True:
        try:
            new_files = scan_for_new_files()

            if new_files:
                for file_path in new_files:
                    print(f"\n🆕 New file detected: {os.path.basename(file_path)}")

                    # Get file info
                    info = get_file_info(file_path)

                    # Prepare email
                    subject = f"New File Detected: {info['name']}"
                    body = f"""A new file has been detected in your monitored folder.

File Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 Name: {info['name']}
📍 Path: {info['path']}
📊 Size: {info['size']:,} bytes
🕒 Modified: {info['modified']}

Detected at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""

                    # Send email
                    if send_email(subject, body, file_path):
                        save_to_history(file_path)
                    else:
                        print(f"⚠️ Failed to send email for {info['name']}")
            else:
                current_time = datetime.now().strftime('%H:%M:%S')
                print(f"[{current_time}] No new files detected", end="\r")

            time.sleep(CHECK_INTERVAL)

        except KeyboardInterrupt:
            print("\n\n👋 Monitor stopped by user")
            break
        except Exception as e:
            print(f"\n⚠️ Error: {e}")
            print("Retrying in 10 seconds...")
            time.sleep(10)


# ============================================================================
# 🎯 ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    # Validate configuration
    if not os.path.exists(MONITOR_PATH):
        print(f"❌ Error: Monitor path does not exist: {MONITOR_PATH}")
        exit(1)

    if SENDER_EMAIL == "your-email@gmail.com":
        print("⚠️ Warning: Please configure your email settings first!")
        exit(1)

    monitor_files()