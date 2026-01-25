import dropbox
import pdfplumber
import io

ACCESS_TOKEN = 'sl.u.AGPj7IsrZVtau8kuZhwZuYxCd5UBC0wcrRS2wcm-UZepxpwqZ1Fi3Gsckx-HnMC3F4ffCkMpSlUJB7ZfGTV-EKBK9UtsZzFVJ8RerP26-Zwg6PFxEWasWVzyHdfkK7JvWv-UjnJjY9VYLfpeX4_Ldc2YSVtHoVHpG-XZ4jZ5itqx9JXFC7iGY4OskjqzoMHS6uOBgxP3puqFMZydCtr1Ot5rH-MdzDiPiJrPFt12IxjpMu8pXfaqmIxFtG_G6cFGODOMjxoVlMZYiA6hlHcDaAPxYOmknjepjwvUrRLgcHo4mmeMxCFiHOzCQNaE2wZuDFssBQu1J8MSnWLRKbFynEUrierY5dq2b3tX9WjrtaiAR_mXQrOOagkg-98TRbLVDkLpcsiBDv1qwvM2yzN0_7JBI66aoTLC7eTp_U_ApfSE_mIw8vS3R67upNw0Q5YWxg6qGPUQ9_Og_fWe_RDyQeeLDH7O-_i8DTuRI2TfSsr1nRGZIV9INC1bWIH5F5Opvcv4fKumSMMWVtrpp8dFsBw_TXKhDl7eSBx7uzni4wEXXruN2Xdub1drx3ARS2pBjQigqJFO7xaWa4xRJmFT93F6J1wsNp0DEGj2SaD3h6Ic6smrEFJvQ-W1G3f1YHxTRCoeIWLpopXFRh1JNNV5GfwgO93FKL3Mq_fW9jGgGUNdo7b89fWEPQ6CP_3h8g0lkIX9OutsoCjcjkZazq3Xsaqw2yTKtgR_NC_4O-ywIhWg5SEk6Heak8_86fulGE4KNmlZl5K24Xl-aOHupphd-jHqXD3fkHpSMB7E00C3j59VK77TPd5_vTxWbgVzYlrmM8A-Wv6A4PW3voUL13943mHOrmIYRwS-M6xMMiWw2K3clsIegTRBBp8ayGNPhx0IyDNHCo6l1ET3H925fP3zBUYeVO7FaPqqIjTOcpu6E8tarrTHugXBvxEr3leOeJevgp6qqvJCQUGBraS8bjugdVY3jV51yq8nLdWP7z30-e2HlICXA5oG1tBehtW5U-y4BNBTVMXS8Gm6L5_MaBoQu2otoQg_2yhHIRXQS0PnDAR0Lq43xXFCaRLLJvWmBG7NgCPH0i4SPV_9m1cUw7iZBW4iHsQ3e3sy4bFUXIpKdwefFjmhe0ItRLMMqSfSzmV08GnVK0tpYK0b3gFKkcriBlbtLiF4f-R354di4-NDULXDbRqdSTCZYUuXrRSAzcGGrTu5jGordyeqfcWKtoOSuFZEi1JgjcEi4dgCFNcHLPuOz1XZmzf2_eV3Q5Gr_mSWhkQ4NoOLcL2GNsG0ElE1h74KiWiuamWaoJ1PjzhT-rCU5HqpvOzbl8iUC36fupLgSAwhtKsrmhT8Fg_uZe58klXhv3iz3JJizHBLBPDkPlfQ_5njkrgwofSLUZh_-vYHelw48seOSWSV9iejn01pmYXy'
dbx = dropbox.Dropbox(ACCESS_TOKEN)

from main import ACCESS_TOKEN as token

# ============================================================================
# CONFIGURATIE - PAS HIER JE INSTELLINGEN AAN
# ============================================================================

# Dropbox toegang
ACCESS_TOKEN = token
def find_epc_documents(path=''):
    epc_files = []

    try:
        result = dbx.files_list_folder(path)

        for entry in result.entries:
            if isinstance(entry, dropbox.files.FileMetadata):
                if 'vak' in entry.name.lower() and entry.name.lower().endswith('.pdf'):
                    epc_files.append(entry.path_display)
            elif isinstance(entry, dropbox.files.FolderMetadata):
                epc_files.extend(find_epc_documents(entry.path_display))

    except Exception as e:
        print(f"Fout bij zoeken: {e}")

    return epc_files


def read_pdf_from_dropbox(file_path):
    """Leest een PDF uit Dropbox en extraheert de tekst"""
    try:
        # Download het bestand uit Dropbox
        metadata, response = dbx.files_download(file_path)
        pdf_bytes = response.content

        # Open de PDF met pdfplumber
        pdf_file = io.BytesIO(pdf_bytes)
        full_text = ""

        with pdfplumber.open(pdf_file) as pdf:
            print(f"\n{'=' * 60}")
            print(f"Bestand: {file_path}")
            print(f"Aantal pagina's: {len(pdf.pages)}")
            print(f"{'=' * 60}\n")

            for i, page in enumerate(pdf.pages, 1):
                text = page.extract_text()
                if text:
                    full_text += f"\n--- Pagina {i} ---\n{text}\n"

        return full_text

    except Exception as e:
        print(f"Fout bij lezen van {file_path}: {e}")
        return None


# Hoofdprogramma
print("Zoeken naar EPC documenten...")
epc_bestanden = find_epc_documents('')

print(f"\nGevonden {len(epc_bestanden)} EPC documenten:")
for bestand in epc_bestanden:
    print(f"  - {bestand}")

# Lees elk document uit
print("\n\nDocumenten uitlezen...")
for bestand in epc_bestanden:
    tekst = read_pdf_from_dropbox(bestand)
    if tekst:
        with open("output.txt", "a", encoding="utf-8") as f:
            f.write(tekst)
        print(tekst)
        print("\n" + "=" * 80 + "\n")