"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Settings, Save } from "lucide-react"

interface SettingItem {
  id: string
  key: string
  value: string
  type: string
  label: string | null
  description: string | null
}

const DEFAULT_SETTINGS = [
  {
    key: "answer_retention_days",
    label: "答题记录保留天数",
    description: "超过此天数的 AnswerRecord 将在自愈时自动清理",
    type: "number",
    defaultValue: "30",
  },
]

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [editedValues, setEditedValues] = useState<Record<string, string>>({})

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/admin/settings", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      const existing = data.settings || []

      // 合并默认值
      const merged = DEFAULT_SETTINGS.map((def) => {
        const found = existing.find((s: SettingItem) => s.key === def.key)
        return found || { key: def.key, value: def.defaultValue, type: def.type, label: def.label, description: def.description }
      })
      setSettings(merged)
      const vals: Record<string, string> = {}
      merged.forEach((s) => { vals[s.key] = s.value })
      setEditedValues(vals)
    } catch {} finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  const handleSave = async (key: string) => {
    setSaving((prev) => ({ ...prev, [key]: true }))
    try {
      const token = localStorage.getItem("token")
      await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ key, value: editedValues[key] }),
      })
    } catch {} finally {
      setSaving((prev) => ({ ...prev, [key]: false }))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" /> 系统设置
        </h1>
        <p className="text-muted-foreground mt-1">管理平台全局配置</p>
      </div>

      <div className="space-y-4">
        {settings.map((s) => (
          <Card key={s.key}>
            <CardHeader>
              <CardTitle className="text-base">{s.label || s.key}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {s.description && (
                <p className="text-sm text-muted-foreground">{s.description}</p>
              )}
              <div className="flex items-center gap-3">
                {s.type === "number" && (
                  <Input
                    type="number"
                    className="w-32"
                    value={editedValues[s.key] || ""}
                    onChange={(e) => setEditedValues((prev) => ({ ...prev, [s.key]: e.target.value }))}
                    min={1}
                  />
                )}
                {s.type === "string" && (
                  <Input
                    className="flex-1"
                    value={editedValues[s.key] || ""}
                    onChange={(e) => setEditedValues((prev) => ({ ...prev, [s.key]: e.target.value }))}
                  />
                )}
                {s.type === "boolean" && (
                  <select
                    className="h-10 rounded-md border px-3 py-2 text-sm"
                    value={editedValues[s.key] || "false"}
                    onChange={(e) => setEditedValues((prev) => ({ ...prev, [s.key]: e.target.value }))}
                  >
                    <option value="true">启用</option>
                    <option value="false">禁用</option>
                  </select>
                )}
                <Button
                  size="sm"
                  onClick={() => handleSave(s.key)}
                  disabled={saving[s.key] || editedValues[s.key] === s.value}
                >
                  <Save className="h-4 w-4 mr-1" />
                  {saving[s.key] ? "保存中..." : "保存"}
                </Button>
                {(saving[s.key] || editedValues[s.key] === s.value) && (
                  <span className="text-xs text-muted-foreground">天</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
