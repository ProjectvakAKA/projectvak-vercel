import { Database, Cloud, Cpu, Eye, Server, Lock, Zap, Globe, Code, Layers, GitBranch, Package } from 'lucide-react';

const DetailedArchitectureDiagram = () => {
  const [activeLayer, setActiveLayer] = useState('all');
  const [hoveredBox, setHoveredBox] = useState(null);

  const layers = {
    frontend: {
      title: "FRONT-END LAYER",
      color: "bg-green-50 border-green-300",
      components: [
        {
          id: "nextjs",
          title: "Next.js 14 (App Router)",
          tech: "React 18 + TypeScript",
          icon: Code,
          details: [
            "Server & Client Components",
            "API Routes for backend logic",
            "File-based routing",
            "Server-side rendering (SSR)"
          ]
        },
        {
          id: "ui-components",
          title: "UI Components",
          tech: "shadcn/ui + Tailwind CSS",
          icon: Layers,
          details: [
            "Connections page (Dropbox setup)",
            "Inbox (EPC status overview)",
            "Property detail view",
            "Push log & audit trail"
          ]
        },
        {
          id: "state",
          title: "State Management",
          tech: "React Hooks + Context",
          icon: GitBranch,
          details: [
            "useState for local state",
            "useEffect for data fetching",
            "Context for global auth state",
            "Real-time updates via polling"
          ]
        }
      ]
    },
    backend: {
      title: "BACK-END / LOGIC LAYER",
      color: "bg-purple-50 border-purple-300",
      components: [
        {
          id: "api-routes",
          title: "Next.js API Routes",
          tech: "Server-side endpoints",
          icon: Server,
          details: [
            "/api/dropbox/sync - Trigger sync",
            "/api/parse/epc - Parse PDF",
            "/api/whise/push - Send to Whise",
            "/api/webhooks/dropbox - Handle events"
          ]
        },
        {
          id: "dropbox-service",
          title: "Dropbox Service",
          tech: "Dropbox SDK",
          icon: Cloud,
          details: [
            "OAuth 2.0 authentication",
            "Folder listing & monitoring",
            "File download via API",
            "Delta cursor for changes"
          ]
        },
        {
          id: "pdf-processor",
          title: "PDF Processing",
          tech: "PDF.js + Text Extraction",
          icon: Package,
          details: [
            "Text extraction from PDF",
            "OCR detection for scans",
            "Base64 encoding for AI",
            "Quality validation"
          ]
        },
        {
          id: "validation-engine",
          title: "Validation Engine",
          tech: "Business Logic",
          icon: Zap,
          details: [
            "Required fields check",
            "Data type validation",
            "Range & format checks",
            "Confidence thresholds (>85%)"
          ]
        },
        {
          id: "whise-service",
          title: "Whise Integration",
          tech: "Whise REST API",
          icon: Server,
          details: [
            "Property upsert endpoint",
            "PDF attachment upload",
            "Retry logic with exponential backoff",
            "Error handling & logging"
          ]
        }
      ]
    },
    ai: {
      title: "AI COMPONENTS LAYER",
      color: "bg-blue-50 border-blue-300",
      components: [
        {
          id: "claude-api",
          title: "Claude API (Anthropic)",
          tech: "Claude Sonnet 4.5",
          icon: Cpu,
          details: [
            "Document understanding (NLP + OCR)",
            "Entity extraction (vloeroppervlakte, bouwjaar, energieklasse)",
            "Structured JSON extraction",
            "Field: energyClass, m², year, administratieve kenmerken",
            "Confidence scores per field",
            "Detectie van uitzonderingen (handgeschreven documenten)"
          ]
        },
        {
          id: "ai-prompts",
          title: "Prompt Engineering",
          tech: "Custom Extraction Prompts",
          icon: Code,
          details: [
            "Flanders EPC-specific schema",
            "Multi-language support (NL/FR)",
            "Evidence snippet extraction",
            "Fallback handling for errors"
          ]
        },
        {
          id: "ai-future",
          title: "Future AI Extensions",
          tech: "Roadmap (Optional)",
          icon: Zap,
          details: [
            "LangChain for multi-doc analysis",
            "AgentKit for workflow automation",
            "OCR provider (Tesseract/Google Vision)",
            "Other document types (asbestos, etc.)"
          ]
        }
      ]
    },
    database: {
      title: "DATABASE LAYER",
      color: "bg-yellow-50 border-yellow-300",
      components: [
        {
          id: "supabase",
          title: "Supabase PostgreSQL",
          tech: "Relational Database + Auth",
          icon: Database,
          details: [
            "Row Level Security (RLS)",
            "Real-time subscriptions",
            "Encrypted API tokens",
            "Automatic backups"
          ]
        },
        {
          id: "schema",
          title: "Database Schema",
          tech: "Core Entities",
          icon: Layers,
          details: [
            "Property (het pand)",
            "LegalDocument (EPC, asbest, etc.)",
            "DocumentType (type + vereiste velden)",
            "ExtractedField (AI-geëxtraheerde info)",
            "PropertyAttribute (genormaliseerde kenmerken)",
            "ExtractionRun (AI-analyse traceerbaarheid)",
            "ValidationStatus (validatie & volledigheid)",
            "AbnormalFinding (asbest, risico's)",
            "IntegrationLog (Whise/Dropbox sync)"
          ]
        }
      ]
    },
    deployment: {
      title: "DEPLOYMENT & HOSTING",
      color: "bg-orange-50 border-orange-300",
      components: [
        {
          id: "vercel",
          title: "Vercel",
          tech: "Next.js Hosting Platform",
          icon: Globe,
          details: [
            "Automatic deployments from Git",
            "Edge network (global CDN)",
            "Environment variables management",
            "Preview deployments per PR"
          ]
        },
        {
          id: "env-vars",
          title: "Environment Config",
          tech: "Secrets Management",
          icon: Lock,
          details: [
            "ANTHROPIC_API_KEY (Claude)",
            "DROPBOX_ACCESS_TOKEN",
            "WHISE_API_KEY",
            "SUPABASE_URL + ANON_KEY",
            "All encrypted at rest"
          ]
        },
        {
          id: "monitoring",
          title: "Monitoring & Logs",
          tech: "Observability",
          icon: Eye,
          details: [
            "Vercel Analytics",
            "Error tracking (Sentry optional)",
            "Audit logs in database",
            "Webhook delivery monitoring"
          ]
        }
      ]
    },
    integrations: {
      title: "EXTERNAL INTEGRATIONS",
      color: "bg-red-50 border-red-300",
      components: [
        {
          id: "dropbox-ext",
          title: "Dropbox Professional",
          tech: "Cloud Storage",
          icon: Cloud,
          details: [
            "OAuth 2.0 connection",
            "Webhook notifications",
            "File storage & versioning",
            "Team folder sharing"
          ]
        },
        {
          id: "claude-ext",
          title: "Anthropic Claude API",
          tech: "AI Extraction Service",
          icon: Cpu,
          details: [
            "Pay-per-token pricing",
            "99.9% uptime SLA",
            "Rate limiting (60 req/min)",
            "PDF vision capabilities"
          ]
        },
        {
          id: "whise-ext",
          title: "Whise Back-Office",
          tech: "Real Estate CRM",
          icon: Server,
          details: [
            "REST API v1",
            "Property management endpoints",
            "Document attachment support",
            "Webhook support (optional)"
          ]
        }
      ]
    }
  };

  const ComponentBox = ({ component, layerColor }) => (
    <div
      className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
        hoveredBox === component.id
          ? 'shadow-xl scale-105 border-blue-500'
          : `${layerColor} hover:shadow-lg`
      }`}
      onMouseEnter={() => setHoveredBox(component.id)}
      onMouseLeave={() => setHoveredBox(null)}
    >
      <div className="flex items-center gap-2 mb-2">
        <component.icon className="w-5 h-5 text-gray-700" />
        <h4 className="font-bold text-sm">{component.title}</h4>
      </div>
      <p className="text-xs text-gray-600 mb-2 font-mono bg-white bg-opacity-60 px-2 py-1 rounded">
        {component.tech}
      </p>
      <ul className="text-xs space-y-1 text-gray-700">
        {component.details.slice(0, hoveredBox === component.id ? undefined : 2).map((detail, idx) => (
          <li key={idx} className="flex items-start gap-1">
            <span className="text-blue-600 font-bold">•</span>
            <span>{detail}</span>
          </li>
        ))}
        {!hoveredBox && component.details.length > 2 && (
          <li className="text-blue-600 font-semibold">+ {component.details.length - 2} more...</li>
        )}
      </ul>
    </div>
  );

  const filteredLayers = activeLayer === 'all' 
    ? Object.entries(layers) 
    : Object.entries(layers).filter(([key]) => key === activeLayer);

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Complete Software Architecture
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            EPC Auto-Sync Platform - Dropbox → AI Processing → Whise Integration
          </p>
          <div className="flex gap-3 text-sm">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-semibold">Next.js 14</span>
            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full font-semibold">Claude AI</span>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full font-semibold">Supabase</span>
            <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full font-semibold">Vercel</span>
          </div>
        </div>

        {/* Layer Filter */}
        <div className="mb-6 bg-white rounded-xl shadow-lg p-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveLayer('all')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                activeLayer === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Layers
            </button>
            {Object.entries(layers).map(([key, layer]) => (
              <button
                key={key}
                onClick={() => setActiveLayer(key)}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  activeLayer === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {layer.title}
              </button>
            ))}
          </div>
        </div>

        {/* Architecture Layers */}
        <div className="space-y-6">
          {filteredLayers.map(([key, layer]) => (
            <div key={key} className={`rounded-xl border-2 p-6 ${layer.color}`}>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-2 h-8 bg-blue-600 rounded"></div>
                {layer.title}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {layer.components.map((component) => (
                  <ComponentBox
                    key={component.id}
                    component={component}
                    layerColor={layer.color}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Data Flow Diagram */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Complete Data Flow</h2>
          <div className="space-y-4">
            {[
              { step: 1, layer: "External", action: "Makelaar uploadt legale documenten (EPC, asbest, watertoets, stedenbouwkundige inlichtingen) naar Dropbox folder", color: "bg-red-100" },
              { step: 2, layer: "Back-end", action: "Dropbox Service detecteert nieuwe file (webhook/polling)", color: "bg-purple-100" },
              { step: 3, layer: "Back-end", action: "PDF Processor extraheert text uit document", color: "bg-purple-100" },
              { step: 4, layer: "AI", action: "Claude API analyseert documenten en extraheert structured data (vloeroppervlakte, bouwjaar, energieklasse, administratieve kenmerken)", color: "bg-blue-100" },
              { step: 5, layer: "Back-end", action: "Validation Engine: validatie 'compleet' vs 'incompleet dossier', statusmeldingen bij ontbrekende documenten", color: "bg-purple-100" },
              { step: 6, layer: "Database", action: "Database slaat extraction runs, extracted fields, property attributes, abnormal findings en validation status op", color: "bg-yellow-100" },
              { step: 7, layer: "Front-end", action: "Dashboard toont dossier status: compleet/incompleet, overzicht eigenschappen, abnormale bevindingen (asbest, risico's)", color: "bg-green-100" },
              { step: 8, layer: "Front-end", action: "Makelaar bekijkt/edit fields (optioneel) en approved", color: "bg-green-100" },
              { step: 9, layer: "Back-end", action: "Whise Service pusht gevalideerde property attributes naar CRM (via API, import module, of iPaaS/middleware)", color: "bg-purple-100" },
              { step: 10, layer: "Database", action: "Integration log registreert alle Whise en Dropbox sync attempts voor traceability", color: "bg-yellow-100" },
              { step: 11, layer: "External", action: "Whise CRM ontvangt automatisch ingevulde velden: vloeroppervlakte, bouwjaar, energieklasse, alle administratieve kenmerken + PDF attachments", color: "bg-red-100" }
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  {item.step}
                </div>
                <div className="flex-1">
                  <div className={`p-3 rounded-lg ${item.color}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-gray-600 uppercase">{item.layer}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-800">{item.action}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Database Schema Detail */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Database Schema (Core Entities)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                table: "property",
                fields: ["id (INT PK)", "address (VARCHAR)", "whise_property_id (VARCHAR)", "dropbox_folder_path (VARCHAR)", "status (ENUM)", "created_at", "updated_at"]
              },
              {
                table: "legal_document",
                fields: ["id (INT PK)", "property_id (FK)", "document_type_id (FK)", "dropbox_file_id (VARCHAR)", "file_path (VARCHAR)", "upload_date", "file_size (INT)"]
              },
              {
                table: "document_type",
                fields: ["id (INT PK)", "type_name (VARCHAR)", "required_fields (JSON)", "is_mandatory (BOOLEAN)", "description (TEXT)"]
              },
              {
                table: "extraction_run",
                fields: ["id (INT PK)", "document_id (FK)", "extraction_timestamp", "ai_model (VARCHAR)", "confidence_score (DECIMAL)", "status (ENUM)", "error_log (TEXT)"]
              },
              {
                table: "extracted_field",
                fields: ["id (INT PK)", "extraction_run_id (FK)", "field_name (VARCHAR)", "field_value (TEXT)", "confidence (DECIMAL)", "source_page (INT)", "evidence_snippet (TEXT)"]
              },
              {
                table: "property_attribute",
                fields: ["id (INT PK)", "property_id (FK)", "attribute_name (VARCHAR)", "attribute_value (TEXT)", "source_document_id (FK)", "source_field_id (FK)", "verified (BOOLEAN)"]
              },
              {
                table: "validation_status",
                fields: ["id (INT PK)", "property_id (FK)", "is_complete (BOOLEAN)", "missing_documents (JSON)", "last_validation", "completion_percentage (DECIMAL)"]
              },
              {
                table: "abnormal_finding",
                fields: ["id (INT PK)", "property_id (FK)", "source_document_id (FK)", "finding_type (VARCHAR)", "severity (ENUM)", "description (TEXT)", "detected_at"]
              },
              {
                table: "integration_log",
                fields: ["id (INT PK)", "property_id (FK)", "integration_type (ENUM)", "action (VARCHAR)", "status (ENUM)", "request_data (JSON)", "response_data (JSON)", "timestamp"]
              }
            ].map((schema) => (
              <div key={schema.table} className="p-4 border-2 border-gray-200 rounded-lg bg-gray-50">
                <h3 className="font-bold text-lg mb-3 text-blue-700 font-mono">{schema.table}</h3>
                <ul className="space-y-1">
                  {schema.fields.map((field, idx) => (
                    <li key={idx} className="text-sm font-mono text-gray-700 flex items-start gap-2">
                      <span className="text-green-600">▸</span>
                      {field}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
            <h4 className="font-bold text-sm mb-2 text-blue-900">Key Relationships (EER Diagram):</h4>
            <ul className="text-sm space-y-1 text-blue-800">
              <li>• property → legal_document (1:N) - Één pand heeft meerdere documenten</li>
              <li>• document_type → legal_document (1:N) - Elk document heeft één type</li>
              <li>• legal_document → extraction_run (1:N) - Document kan meerdere keren geanalyseerd worden</li>
              <li>• extraction_run → extracted_field (1:N) - Elke run extraheert meerdere velden</li>
              <li>• property → property_attribute (1:N) - Elk pand heeft meerdere attributen</li>
              <li>• property → validation_status (1:1) - Elk pand heeft één validatiestatus</li>
              <li>• property → abnormal_finding (1:N) - Elk pand kan meerdere bevindingen hebben</li>
              <li>• extracted_field → property_attribute (1:N) - Geëxtraheerde velden worden attributen</li>
              <li>• legal_document → property_attribute (1:N) - Bron-tracking</li>
              <li>• legal_document → abnormal_finding (1:N) - Bron van bevindingen</li>
            </ul>
          </div>
        </div>

        {/* Technology Stack Summary */}
        <div className="mt-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg p-8 text-white">
          <h2 className="text-2xl font-bold mb-6">Complete Technology Stack</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-bold mb-3 text-lg">Frontend Stack</h3>
              <ul className="space-y-2 text-sm">
                <li>✓ Next.js 14 (App Router)</li>
                <li>✓ React 18 + TypeScript</li>
                <li>✓ shadcn/ui Components</li>
                <li>✓ Tailwind CSS</li>
                <li>✓ Lucide React Icons</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-3 text-lg">Backend Stack</h3>
              <ul className="space-y-2 text-sm">
                <li>✓ Next.js API Routes</li>
                <li>✓ Supabase (Postgres + Auth)</li>
                <li>✓ Dropbox SDK</li>
                <li>✓ PDF.js (text extraction)</li>
                <li>✓ Claude API (Anthropic)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-3 text-lg">DevOps & Deployment</h3>
              <ul className="space-y-2 text-sm">
                <li>✓ Vercel (hosting)</li>
                <li>✓ GitHub (version control)</li>
                <li>✓ Environment variables</li>
                <li>✓ Webhook monitoring</li>
                <li>✓ Row Level Security (RLS)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailedArchitectureDiagram;
