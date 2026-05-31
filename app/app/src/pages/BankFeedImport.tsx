import { useState, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  type: "income" | "expense"
  category: string
  selected: boolean
}

interface ImportHistory {
  id: string
  date: string
  fileName: string
  count: number
  status: "success" | "partial" | "failed"
}

interface ColumnMapping {
  date: number
  description: number
  amount: number
  type: number
}

const categorizationRules: { keyword: string; category: string; type: "income" | "expense" }[] = [
  { keyword: "salary", category: "Payroll", type: "expense" },
  { keyword: "payroll", category: "Payroll", type: "expense" },
  { keyword: "rent", category: "Rent", type: "expense" },
  { keyword: "utility", category: "Utilities", type: "expense" },
  { keyword: "electric", category: "Utilities", type: "expense" },
  { keyword: "water", category: "Utilities", type: "expense" },
  { keyword: "internet", category: "Utilities", type: "expense" },
  { keyword: "client", category: "Client Payment", type: "income" },
  { keyword: "invoice", category: "Invoice Payment", type: "income" },
  { keyword: "deposit", category: "Deposit", type: "income" },
  { keyword: "transfer", category: "Transfer", type: "expense" },
  { keyword: "subscription", category: "Subscriptions", type: "expense" },
  { keyword: "amazon", category: "Office Supplies", type: "expense" },
  { keyword: "office", category: "Office Supplies", type: "expense" },
  { keyword: "travel", category: "Travel", type: "expense" },
  { keyword: "meal", category: "Meals", type: "expense" },
  { keyword: "restaurant", category: "Meals", type: "expense" },
  { keyword: "insurance", category: "Insurance", type: "expense" },
  { keyword: "tax", category: "Taxes", type: "expense" },
  { keyword: "interest", category: "Interest Income", type: "income" },
  { keyword: "refund", category: "Refund", type: "income" },
]

const sampleHistory: ImportHistory[] = [
  { id: "1", date: "2026-05-28", fileName: "bank_may_2026.csv", count: 47, status: "success" },
  { id: "2", date: "2026-05-15", fileName: "bank_apr_2026.csv", count: 52, status: "success" },
  { id: "3", date: "2026-04-30", fileName: "bank_mar_2026.csv", count: 38, status: "partial" },
  { id: "4", date: "2026-04-15", fileName: "bank_feb_2026.csv", count: 0, status: "failed" },
]

export default function BankFeedImport() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [importHistory, setImportHistory] = useState<ImportHistory[]>(sampleHistory)
  const [fileName, setFileName] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({ date: 0, description: 1, amount: 2, type: 3 })
  const [showMapping, setShowMapping] = useState(false)
  const [rawData, setRawData] = useState<string[][]>([])
  const [fileType, setFileType] = useState<"csv" | "ofx" | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const ofxInputRef = useRef<HTMLInputElement>(null)

  const categorizeTransaction = (description: string): { category: string; type: "income" | "expense" } => {
    const lowerDesc = description.toLowerCase()
    for (const rule of categorizationRules) {
      if (lowerDesc.includes(rule.keyword)) {
        return { category: rule.category, type: rule.type }
      }
    }
    return { category: "Uncategorized", type: "expense" }
  }

  const parseCSV = useCallback((text: string, name: string) => {
    const lines = text.split("\n").filter((l) => l.trim())
    if (lines.length < 2) {
      toast.error("File appears to be empty or has no data rows")
      return
    }
    const rows = lines.map((line) => {
      const result: string[] = []
      let current = ""
      let inQuotes = false
      for (const char of line) {
        if (char === '"') { inQuotes = !inQuotes }
        else if (char === "," && !inQuotes) { result.push(current.trim()); current = "" }
        else { current += char }
      }
      result.push(current.trim())
      return result
    })
    setRawData(rows)
    setFileName(name)
    setFileType("csv")
    setShowMapping(true)
    toast.success(`Loaded ${rows.length - 1} rows from ${name}`)
  }, [])

  const processWithMapping = () => {
    if (rawData.length < 2) return
    const header = rawData[0]
    const dataRows = rawData.slice(1)
    const parsed: Transaction[] = dataRows
      .filter((row) => row.length > Math.max(columnMapping.date, columnMapping.description, columnMapping.amount))
      .map((row, i) => {
        const desc = row[columnMapping.description] || ""
        const rawAmount = parseFloat((row[columnMapping.amount] || "0").replace(/[$,\s]/g, ""))
        const { category, type } = categorizeTransaction(desc)
        return {
          id: `tx-${Date.now()}-${i}`,
          date: row[columnMapping.date] || "",
          description: desc,
          amount: Math.abs(rawAmount),
          type,
          category,
          selected: true,
        }
      })
    setTransactions(parsed)
    setShowMapping(false)
    toast.success(`Parsed ${parsed.length} transactions`)
  }

  const parseOFX = useCallback((text: string, name: string) => {
    const txns: Transaction[] = []
    const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g
    let match
    let i = 0
    while ((match = stmtTrnRegex.exec(text)) !== null) {
      const block = match[1]
      const get = (tag: string) => {
        const m = block.match(new RegExp(`<${tag}>([^<]*)`))
        return m ? m[1].trim() : ""
      }
      const dateStr = get("DTPOSTED")
      const amount = parseFloat(get("TRNAMT") || "0")
      const name2 = get("NAME") || get("MEMO") || ""
      const formattedDate = dateStr.length >= 8 ? `${dateStr.slice(4, 6)}/${dateStr.slice(6, 8)}/${dateStr.slice(0, 4)}` : dateStr
      const { category, type } = categorizeTransaction(name2)
      txns.push({
        id: `ofx-${Date.now()}-${i++}`,
        date: formattedDate,
        description: name2,
        amount: Math.abs(amount),
        type: amount >= 0 ? "income" : "expense",
        category,
        selected: true,
      })
    }
    setTransactions(txns)
    setFileName(name)
    setFileType("ofx")
    toast.success(`Parsed ${txns.length} transactions from OFX file`)
  }, [])

  const handleFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      if (file.name.endsWith(".csv")) {
        parseCSV(text, file.name)
      } else if (file.name.endsWith(".ofx") || file.name.endsWith(".qfx")) {
        parseOFX(text, file.name)
      } else {
        toast.error("Unsupported file type. Please use CSV or OFX/QFX files.")
      }
    }
    reader.readAsText(file)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [])

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = () => setIsDragging(false)

  const toggleSelect = (id: string) => {
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t)))
  }

  const toggleAll = () => {
    const allSelected = transactions.every((t) => t.selected)
    setTransactions((prev) => prev.map((t) => ({ ...t, selected: !allSelected })))
  }

  const importSelected = () => {
    const selected = transactions.filter((t) => t.selected)
    if (selected.length === 0) {
      toast.error("No transactions selected")
      return
    }
    const newEntry: ImportHistory = {
      id: Date.now().toString(),
      date: new Date().toISOString().split("T")[0],
      fileName,
      count: selected.length,
      status: "success",
    }
    setImportHistory((prev) => [newEntry, ...prev])
    toast.success(`Imported ${selected.length} transactions`)
    setTransactions([])
    setFileName("")
  }

  const totalIncome = transactions.filter((t) => t.selected && t.type === "income").reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter((t) => t.selected && t.type === "expense").reduce((s, t) => s + t.amount, 0)
  const selectedCount = transactions.filter((t) => t.selected).length

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Bank Feed Import</h1>
          <p className="text-gray-600 mt-2">Import and categorize bank transactions from CSV or OFX files</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Upload Bank Statement</CardTitle>
                <CardDescription>Drag and drop a CSV or OFX/QFX file, or click to browse</CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all ${
                    isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                  }`}
                >
                  <div className="text-gray-400 mb-4">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-lg font-medium text-gray-700">Drop files here or click to upload</p>
                  <p className="text-sm text-gray-500 mt-1">Supports CSV, OFX, and QFX formats</p>
                </div>
                <input ref={fileInputRef} type="file" accept=".csv,.ofx,.qfx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = "" }} />

                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => ofxInputRef.current?.click()}>
                    Upload OFX/QFX
                  </Button>
                  <input ref={ofxInputRef} type="file" accept=".ofx,.qfx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = "" }} />
                </div>
              </CardContent>
            </Card>

            {transactions.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Imported Transactions</CardTitle>
                      <CardDescription>{fileName} ({fileType?.toUpperCase()}) - {transactions.length} transactions found</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setShowMapping(true)}>Column Mapping</Button>
                      <Button size="sm" onClick={importSelected} disabled={selectedCount === 0}>
                        Import Selected ({selectedCount})
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="p-3 rounded-lg bg-green-50">
                      <p className="text-sm text-green-600">Income</p>
                      <p className="text-lg font-bold text-green-700">${totalIncome.toLocaleString()}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-red-50">
                      <p className="text-sm text-red-600">Expenses</p>
                      <p className="text-lg font-bold text-red-700">${totalExpense.toLocaleString()}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-50">
                      <p className="text-sm text-blue-600">Net</p>
                      <p className="text-lg font-bold text-blue-700">${(totalIncome - totalExpense).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">
                            <input type="checkbox" checked={transactions.length > 0 && transactions.every((t) => t.selected)} onChange={toggleAll} className="rounded" />
                          </TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Type</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell>
                              <input type="checkbox" checked={tx.selected} onChange={() => toggleSelect(tx.id)} className="rounded" />
                            </TableCell>
                            <TableCell className="whitespace-nowrap">{tx.date}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{tx.description}</TableCell>
                            <TableCell><Badge variant="outline">{tx.category}</Badge></TableCell>
                            <TableCell className="text-right font-medium">${tx.amount.toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge variant={tx.type === "income" ? "default" : "destructive"}>{tx.type}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Import History</CardTitle>
                <CardDescription>Previous bank statement imports</CardDescription>
              </CardHeader>
              <CardContent>
                {importHistory.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No imports yet</p>
                ) : (
                  <div className="space-y-3">
                    {importHistory.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <p className="font-medium text-sm">{entry.fileName}</p>
                          <p className="text-xs text-gray-500">{entry.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{entry.count} txns</p>
                          <Badge variant={entry.status === "success" ? "default" : entry.status === "partial" ? "secondary" : "destructive"}>
                            {entry.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Dialog open={showMapping} onOpenChange={setShowMapping}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Column Mapping</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {rawData.length > 0 && (
                <div className="p-3 rounded bg-gray-50 text-sm font-mono">
                  <p className="font-semibold mb-1">Headers: {rawData[0].join(", ")}</p>
                  <p className="text-gray-500">First row: {rawData[1]?.join(", ")}</p>
                </div>
              )}
              <div>
                <Label>Date Column</Label>
                <Input type="number" min={0} max={rawData[0]?.length || 5} value={columnMapping.date} onChange={(e) => setColumnMapping({ ...columnMapping, date: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Description Column</Label>
                <Input type="number" min={0} max={rawData[0]?.length || 5} value={columnMapping.description} onChange={(e) => setColumnMapping({ ...columnMapping, description: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Amount Column</Label>
                <Input type="number" min={0} max={rawData[0]?.length || 5} value={columnMapping.amount} onChange={(e) => setColumnMapping({ ...columnMapping, amount: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Type Column (optional, -1 to skip)</Label>
                <Input type="number" min={-1} max={rawData[0]?.length || 5} value={columnMapping.type} onChange={(e) => setColumnMapping({ ...columnMapping, type: parseInt(e.target.value) || -1 })} />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={processWithMapping}>Apply Mapping</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
