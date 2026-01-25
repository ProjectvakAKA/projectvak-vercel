"use client"

import React from "react"

import { useState, useRef } from "react"

interface FormData {
  contract_type: string
  datum_contract: string
  verhuurder_naam: string
  verhuurder_adres: string
  verhuurder_telefoon: string
  verhuurder_email: string
  huurder_naam: string
  huurder_adres: string
  huurder_telefoon: string
  huurder_email: string
  pand_adres: string
  pand_type: string
  pand_oppervlakte: string
  pand_kamers: string
  pand_verdieping: string
  pand_epc: string
  pand_epc_nummer: string
  kadaster_afdeling: string
  kadaster_sectie: string
  kadaster_nummer: string
  kadaster_inkomen: string
  huurprijs: string
  waarborg_bedrag: string
  waarborg_locatie: string
  kosten: string
  indexatie: string
  ingangsdatum: string
  einddatum: string
  duur: string
  opzegtermijn: string
  huisdieren: string
  onderverhuur: string
  werken: string
  toepasselijk_recht: string
  bevoegde_rechtbank: string
  summary: string
}

const initialFormData: FormData = {
  contract_type: "",
  datum_contract: "",
  verhuurder_naam: "",
  verhuurder_adres: "",
  verhuurder_telefoon: "",
  verhuurder_email: "",
  huurder_naam: "",
  huurder_adres: "",
  huurder_telefoon: "",
  huurder_email: "",
  pand_adres: "",
  pand_type: "",
  pand_oppervlakte: "",
  pand_kamers: "",
  pand_verdieping: "",
  pand_epc: "",
  pand_epc_nummer: "",
  kadaster_afdeling: "",
  kadaster_sectie: "",
  kadaster_nummer: "",
  kadaster_inkomen: "",
  huurprijs: "",
  waarborg_bedrag: "",
  waarborg_locatie: "",
  kosten: "",
  indexatie: "",
  ingangsdatum: "",
  einddatum: "",
  duur: "",
  opzegtermijn: "",
  huisdieren: "",
  onderverhuur: "",
  werken: "",
  toepasselijk_recht: "",
  bevoegde_rechtbank: "",
  summary: "",
}

function get(obj: Record<string, unknown> | undefined | null, path: string, defaultValue = ""): string {
  if (!obj) return defaultValue
  const keys = path.split(".")
  let result: unknown = obj
  for (const key of keys) {
    if (result === undefined || result === null) return defaultValue
    result = (result as Record<string, unknown>)[key]
  }
  return result === undefined || result === null ? defaultValue : String(result)
}

export default function ContractDataViewer() {
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [status, setStatus] = useState<{ message: string; type: "success" | "error" } | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [validation, setValidation] = useState<{ is_valid: boolean; message: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const loadData = (json: Record<string, unknown>) => {
    // Support multiple JSON structures: contract_data, data, extracted_data, or root level
    const data = (json.contract_data || json.data || json.extracted_data || json) as Record<string, unknown>

    if (json.validation) {
      setValidation(json.validation as { is_valid: boolean; message: string })
    } else {
      setValidation(null)
    }

    const partijen = (data.partijen || {}) as Record<string, unknown>
    const verhuurder = (partijen.verhuurder || {}) as Record<string, unknown>
    const huurder = (partijen.huurder || {}) as Record<string, unknown>
    const pand = (data.pand || {}) as Record<string, unknown>
    const epc = pand.epc as Record<string, unknown> | string | undefined
    const kadaster = (pand.kadaster || {}) as Record<string, unknown>
    const financieel = (data.financieel || {}) as Record<string, unknown>
    const waarborg = financieel.waarborg as Record<string, unknown> | string | undefined
    const periodes = (data.periodes || {}) as Record<string, unknown>
    const voorwaarden = (data.voorwaarden || {}) as Record<string, unknown>
    const juridisch = (data.juridisch || {}) as Record<string, unknown>

    const indexatieValue = financieel.indexatie
    let indexatieStr = ""
    if (indexatieValue === true) indexatieStr = "Ja"
    else if (indexatieValue === false) indexatieStr = "Nee"
    else indexatieStr = get(financieel, "indexatie")

    const huisdierenValue = voorwaarden.huisdieren
    let huisdierenStr = ""
    if (huisdierenValue === true) huisdierenStr = "Toegestaan"
    else if (huisdierenValue === false) huisdierenStr = "Niet toegestaan"
    else huisdierenStr = get(voorwaarden, "huisdieren")

    const onderverhuurValue = voorwaarden.onderverhuur
    let onderverhuurStr = ""
    if (onderverhuurValue === true) onderverhuurStr = "Toegestaan"
    else if (onderverhuurValue === false) onderverhuurStr = "Niet toegestaan"
    else onderverhuurStr = get(voorwaarden, "onderverhuur")

    setFormData({
      contract_type: get(data, "contract_type"),
      datum_contract: get(data, "datum_contract"),
      verhuurder_naam: get(verhuurder, "naam"),
      verhuurder_adres: get(verhuurder, "adres"),
      verhuurder_telefoon: get(verhuurder, "telefoon"),
      verhuurder_email: get(verhuurder, "email"),
      huurder_naam: get(huurder, "naam"),
      huurder_adres: get(huurder, "adres"),
      huurder_telefoon: get(huurder, "telefoon"),
      huurder_email: get(huurder, "email"),
      pand_adres: get(pand, "adres"),
      pand_type: get(pand, "type"),
      pand_oppervlakte: get(pand, "oppervlakte"),
      pand_kamers: get(pand, "aantal_kamers"),
      pand_verdieping: get(pand, "verdieping"),
      pand_epc: typeof epc === "object" ? get(epc, "energielabel") : String(epc || ""),
      pand_epc_nummer: typeof epc === "object" ? get(epc, "certificaatnummer") : "",
      kadaster_afdeling: get(kadaster, "afdeling"),
      kadaster_sectie: get(kadaster, "sectie"),
      kadaster_nummer: get(kadaster, "nummer"),
      kadaster_inkomen: get(kadaster, "kadastraal_inkomen"),
      huurprijs: get(financieel, "huurprijs"),
      waarborg_bedrag: typeof waarborg === "object" ? get(waarborg, "bedrag") : String(waarborg || ""),
      waarborg_locatie: typeof waarborg === "object" ? get(waarborg, "waar_gedeponeerd") : "",
      kosten: get(financieel, "kosten"),
      indexatie: indexatieStr,
      ingangsdatum: get(periodes, "ingangsdatum"),
      einddatum: get(periodes, "einddatum") || "Onbepaalde duur",
      duur: get(periodes, "duur"),
      opzegtermijn: get(periodes, "opzegtermijn"),
      huisdieren: huisdierenStr,
      onderverhuur: onderverhuurStr,
      werken: get(voorwaarden, "werken"),
      toepasselijk_recht: get(juridisch, "toepasselijk_recht"),
      bevoegde_rechtbank: get(juridisch, "bevoegde_rechtbank"),
      summary: get(json, "summary"),
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith(".json")) {
      setStatus({ message: "Selecteer een geldig JSON bestand", type: "error" })
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string)
        loadData(json)
        setStatus({ message: "Bestand succesvol geladen", type: "success" })
        setFileName(file.name)
      } catch (error) {
        setStatus({ message: "Fout bij laden JSON: " + (error as Error).message, type: "error" })
      }
    }
    reader.readAsText(file)
  }

  const handleLoadFile = () => {
    fileInputRef.current?.click()
  }

  const handleClearForm = () => {
    if (!confirm("Weet je zeker dat je alle velden wilt legen?")) return
    setFormData(initialFormData)
    setStatus(null)
    setFileName(null)
    setValidation(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleExport = () => {
    const exportData = {
      contract_data: {
        contract_type: formData.contract_type,
        datum_contract: formData.datum_contract,
        partijen: {
          verhuurder: {
            naam: formData.verhuurder_naam,
            adres: formData.verhuurder_adres,
            telefoon: formData.verhuurder_telefoon,
            email: formData.verhuurder_email,
          },
          huurder: {
            naam: formData.huurder_naam,
            adres: formData.huurder_adres,
            telefoon: formData.huurder_telefoon,
            email: formData.huurder_email,
          },
        },
        pand: {
          adres: formData.pand_adres,
          type: formData.pand_type,
          oppervlakte: formData.pand_oppervlakte,
          aantal_kamers: formData.pand_kamers,
          verdieping: formData.pand_verdieping,
          epc: {
            energielabel: formData.pand_epc,
            certificaatnummer: formData.pand_epc_nummer,
          },
          kadaster: {
            afdeling: formData.kadaster_afdeling,
            sectie: formData.kadaster_sectie,
            nummer: formData.kadaster_nummer,
            kadastraal_inkomen: formData.kadaster_inkomen,
          },
        },
        financieel: {
          huurprijs: formData.huurprijs,
          waarborg: {
            bedrag: formData.waarborg_bedrag,
            waar_gedeponeerd: formData.waarborg_locatie,
          },
          kosten: formData.kosten,
          indexatie: formData.indexatie,
        },
        periodes: {
          ingangsdatum: formData.ingangsdatum,
          einddatum: formData.einddatum,
          duur: formData.duur,
          opzegtermijn: formData.opzegtermijn,
        },
        voorwaarden: {
          huisdieren: formData.huisdieren,
          onderverhuur: formData.onderverhuur,
          werken: formData.werken,
        },
        juridisch: {
          toepasselijk_recht: formData.toepasselijk_recht,
          bevoegde_rechtbank: formData.bevoegde_rechtbank,
        },
      },
      summary: formData.summary,
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "contract_data.json"
    a.click()
    URL.revokeObjectURL(url)
  }

  const inputClass =
    "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"

  return (
    <div className="min-h-screen bg-gray-100 p-6 font-sans">
      <div className="mx-auto max-w-6xl space-y-4">
        {/* Header */}
        <div className="bg-white rounded shadow-sm p-6 border border-gray-200">
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Contract Data Viewer</h1>
          <p className="text-sm text-gray-600">Importeer en beheer contractgegevens</p>

          <div className="flex flex-wrap gap-3 mt-5 pt-5 border-t border-gray-200 print:hidden">
            <input
              type="file"
              ref={fileInputRef}
              accept=".json,application/json"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={handleLoadFile}
              className="bg-gray-800 text-white px-4 py-2 text-sm font-medium rounded hover:bg-gray-700 transition"
            >
              Laad JSON Bestand
            </button>
            <button
              onClick={handleExport}
              className="bg-white border border-gray-300 text-gray-700 px-4 py-2 text-sm font-medium rounded hover:bg-gray-50 transition"
            >
              Exporteer JSON
            </button>
            <button
              onClick={() => window.print()}
              className="bg-white border border-gray-300 text-gray-700 px-4 py-2 text-sm font-medium rounded hover:bg-gray-50 transition"
            >
              Print / PDF
            </button>
            <button
              onClick={handleClearForm}
              className="bg-white border border-gray-300 text-gray-700 px-4 py-2 text-sm font-medium rounded hover:bg-gray-50 transition"
            >
              Reset
            </button>
          </div>

          {status && (
            <div
              className={`mt-4 p-3 rounded border text-sm ${
                status.type === "success"
                  ? "bg-green-50 text-green-800 border-green-200"
                  : "bg-red-50 text-red-800 border-red-200"
              }`}
            >
              {status.message}
            </div>
          )}

          {fileName && <div className="mt-3 text-sm text-gray-600">Geladen bestand: {fileName}</div>}
        </div>

        {/* Validation Status */}
        {validation?.is_valid && (
          <div className="bg-white rounded shadow-sm p-4 border border-gray-200">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-gray-700">Validatie:</span>
              <span className="text-green-700">{validation.message}</span>
            </div>
          </div>
        )}

        {/* Document Informatie */}
        <div className="bg-white rounded shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">Document Informatie</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Type Document</label>
              <input
                type="text"
                value={formData.contract_type}
                onChange={(e) => updateField("contract_type", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Datum Contract</label>
              <input
                type="text"
                value={formData.datum_contract}
                onChange={(e) => updateField("datum_contract", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Partijen */}
        <div className="bg-white rounded shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">Partijen</h2>

          <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Verhuurder</h3>
          <div className="grid gap-4 md:grid-cols-2 mb-6 pb-6 border-b border-gray-100">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Naam</label>
              <input
                type="text"
                value={formData.verhuurder_naam}
                onChange={(e) => updateField("verhuurder_naam", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Adres</label>
              <input
                type="text"
                value={formData.verhuurder_adres}
                onChange={(e) => updateField("verhuurder_adres", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Telefoon</label>
              <input
                type="text"
                value={formData.verhuurder_telefoon}
                onChange={(e) => updateField("verhuurder_telefoon", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
              <input
                type="email"
                value={formData.verhuurder_email}
                onChange={(e) => updateField("verhuurder_email", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Huurder</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Naam</label>
              <input
                type="text"
                value={formData.huurder_naam}
                onChange={(e) => updateField("huurder_naam", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Adres</label>
              <input
                type="text"
                value={formData.huurder_adres}
                onChange={(e) => updateField("huurder_adres", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Telefoon</label>
              <input
                type="text"
                value={formData.huurder_telefoon}
                onChange={(e) => updateField("huurder_telefoon", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
              <input
                type="email"
                value={formData.huurder_email}
                onChange={(e) => updateField("huurder_email", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Pand Informatie */}
        <div className="bg-white rounded shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">Pand Informatie</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Adres</label>
              <input
                type="text"
                value={formData.pand_adres}
                onChange={(e) => updateField("pand_adres", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
              <input
                type="text"
                value={formData.pand_type}
                onChange={(e) => updateField("pand_type", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Oppervlakte (m2)</label>
              <input
                type="text"
                value={formData.pand_oppervlakte}
                onChange={(e) => updateField("pand_oppervlakte", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Aantal Kamers</label>
              <input
                type="text"
                value={formData.pand_kamers}
                onChange={(e) => updateField("pand_kamers", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Verdieping</label>
              <input
                type="text"
                value={formData.pand_verdieping}
                onChange={(e) => updateField("pand_verdieping", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">EPC Label</label>
              <input
                type="text"
                value={formData.pand_epc}
                onChange={(e) => updateField("pand_epc", e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">EPC Certificaatnummer</label>
              <input
                type="text"
                value={formData.pand_epc_nummer}
                onChange={(e) => updateField("pand_epc_nummer", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="mt-5 pt-5 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Kadastrale Gegevens</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Afdeling</label>
                <input
                  type="text"
                  value={formData.kadaster_afdeling}
                  onChange={(e) => updateField("kadaster_afdeling", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Sectie</label>
                <input
                  type="text"
                  value={formData.kadaster_sectie}
                  onChange={(e) => updateField("kadaster_sectie", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nummer</label>
                <input
                  type="text"
                  value={formData.kadaster_nummer}
                  onChange={(e) => updateField("kadaster_nummer", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Kadastraal Inkomen (EUR)</label>
                <input
                  type="text"
                  value={formData.kadaster_inkomen}
                  onChange={(e) => updateField("kadaster_inkomen", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Financiele Gegevens */}
        <div className="bg-white rounded shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">
            Financiele Gegevens
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Huurprijs (EUR/maand)</label>
              <input
                type="text"
                value={formData.huurprijs}
                onChange={(e) => updateField("huurprijs", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Waarborg (EUR)</label>
              <input
                type="text"
                value={formData.waarborg_bedrag}
                onChange={(e) => updateField("waarborg_bedrag", e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Waarborg Gedeponeerd Bij</label>
              <input
                type="text"
                value={formData.waarborg_locatie}
                onChange={(e) => updateField("waarborg_locatie", e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Kosten en Lasten</label>
              <textarea
                value={formData.kosten}
                onChange={(e) => updateField("kosten", e.target.value)}
                rows={3}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Indexatie</label>
              <input
                type="text"
                value={formData.indexatie}
                onChange={(e) => updateField("indexatie", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Periodes en Termijnen */}
        <div className="bg-white rounded shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">
            Periodes en Termijnen
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Ingangsdatum</label>
              <input
                type="text"
                value={formData.ingangsdatum}
                onChange={(e) => updateField("ingangsdatum", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Einddatum</label>
              <input
                type="text"
                value={formData.einddatum}
                onChange={(e) => updateField("einddatum", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Duur</label>
              <input
                type="text"
                value={formData.duur}
                onChange={(e) => updateField("duur", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Opzegtermijn</label>
              <input
                type="text"
                value={formData.opzegtermijn}
                onChange={(e) => updateField("opzegtermijn", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Voorwaarden */}
        <div className="bg-white rounded shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">Voorwaarden</h2>
          <div className="grid gap-4 md:grid-cols-2 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Huisdieren</label>
              <input
                type="text"
                value={formData.huisdieren}
                onChange={(e) => updateField("huisdieren", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Onderverhuur</label>
              <input
                type="text"
                value={formData.onderverhuur}
                onChange={(e) => updateField("onderverhuur", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Bijzondere Voorwaarden en Werken</label>
            <textarea
              value={formData.werken}
              onChange={(e) => updateField("werken", e.target.value)}
              rows={4}
              className={inputClass}
            />
          </div>
        </div>

        {/* Juridisch */}
        <div className="bg-white rounded shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">
            Juridische Informatie
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Toepasselijk Recht</label>
              <input
                type="text"
                value={formData.toepasselijk_recht}
                onChange={(e) => updateField("toepasselijk_recht", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Bevoegde Rechtbank</label>
              <input
                type="text"
                value={formData.bevoegde_rechtbank}
                onChange={(e) => updateField("bevoegde_rechtbank", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Samenvatting */}
        <div className="bg-white rounded shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">Samenvatting</h2>
          <textarea
            value={formData.summary}
            onChange={(e) => updateField("summary", e.target.value)}
            rows={8}
            className={`${inputClass} bg-gray-50`}
          />
        </div>
      </div>
    </div>
  )
}
