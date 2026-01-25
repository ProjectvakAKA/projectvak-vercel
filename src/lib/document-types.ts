export interface DocumentType {
  key: string
  nameNL: string
  nameEN: string
  description: string
  required: boolean
  conditional?: string
}

export const documentTypes: DocumentType[] = [
  {
    key: "eigendomstitel",
    nameNL: "Eigendomstitel",
    nameEN: "Deed of Ownership",
    description: "Proof that the seller legally owns the property",
    required: true,
  },
  {
    key: "epc",
    nameNL: "Energieprestatiecertificaat (EPC)",
    nameEN: "Energy Performance Certificate",
    description: "Mandatory energy efficiency certificate required before advertising or selling",
    required: true,
  },
  {
    key: "elektrische_keuring",
    nameNL: "Elektrische keuring (AREI-attest)",
    nameEN: "Electrical Inspection",
    description: "Inspection report of the electrical installation",
    required: true,
  },
  {
    key: "bodemattest",
    nameNL: "Bodemattest (OVAM)",
    nameEN: "Soil Certificate",
    description: "Confirms whether the soil is contaminated or not",
    required: true,
  },
  {
    key: "asbestattest",
    nameNL: "Asbestattest",
    nameEN: "Asbestos Certificate",
    description: "Mandatory for buildings constructed before 2001",
    required: true,
    conditional: "Buildings before 2001",
  },
  {
    key: "stedenbouwkundig_uittreksel",
    nameNL: "Stedenbouwkundig uittreksel",
    nameEN: "Urban Planning Extract",
    description: "Shows zoning, permits, infractions, and allowed use",
    required: true,
  },
  {
    key: "kadastraal_uittreksel",
    nameNL: "Kadastraal uittreksel en plan",
    nameEN: "Cadastral Extract",
    description: "Official cadastral identification, plot boundaries, and reference data",
    required: true,
  },
  {
    key: "pid",
    nameNL: "Post-interventiedossier (PID)",
    nameEN: "Post-Intervention File",
    description: "Required if the building was constructed or renovated after 1 May 2001",
    required: false,
    conditional: "Buildings after May 2001",
  },
  {
    key: "watertoets",
    nameNL: "Watertoets / overstromingsgevoeligheid",
    nameEN: "Flood Risk Assessment",
    description: "Information on flood risk and water sensitivity of the plot",
    required: true,
  },
  {
    key: "stookolietankattest",
    nameNL: "Stookolietankattest",
    nameEN: "Oil Tank Certificate",
    description: "Required if there is or was a heating oil tank",
    required: false,
    conditional: "If oil tank present",
  },
]

export type DocumentKey = (typeof documentTypes)[number]["key"]

export interface PropertyDocument {
  key: DocumentKey
  status: "missing" | "pending" | "parsed" | "needs_review" | "pushed" | "error"
  fileName?: string
  uploadedAt?: string
  confidence?: number
}

export interface Property {
  id: string
  address: string
  city: string
  postalCode: string
  yearOfConstruction?: number
  documents: PropertyDocument[]
  createdAt: string
  updatedAt: string
}
