"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Users, Plus, Trash2, Copy, Eye, Search, Check } from "lucide-react"
import { api } from "@/lib/api"

interface ClassItem {
  id: string
  name: string
  description: string | null
  createdAt: string
  teacher?: { id: string; username: string }
  _count: { members: number; tasks: number }
}

interface Member {
  id: string
  user: { id: string; username: string; role: string }
}

export default function TeacherClassesPage() {
  const router = useRouter()
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialog, setCreateDialog] = useState(false)
  const [editDialog, setEditDialog] = useState<ClassItem | null>(null)
  const [memberDialog, setMemberDialog] = useState<ClassItem | null>(null)
  const [inviteDialog, setInviteDialog] = useState<ClassItem | null>(null)
  const [inviteCode, setInviteCode] = useState("")
  const [inviteError, setInviteError] = useState("")
  const [copied, setCopied] = useState(false)

  const copyCode = async (code: string) => {
    const ta = document.createElement("textarea")
    ta.value = code
    ta.style.position = "fixed"
    ta.style.opacity = "0"
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand("copy")
    document.body.removeChild(ta)
    if (!ok) {
      try {
        await navigator.clipboard.writeText(code)
      } catch {
        // both failed
      }
    }
  }
  const [formName, setFormName] = useState("")
  const [formDesc, setFormDesc] = useState("")
  const [members, setMembers] = useState<Member[]>([])
  const [saving, setSaving] = useState(false)
  // Student selection dialog
  const [studentDialog, setStudentDialog] = useState(false)
  const [studentSearch, setStudentSearch] = useState("")
  const [studentList, setStudentList] = useState<{ id: string; username: string }[]>([])
  const [studentLoading, setStudentLoading] = useState(false)

  const fetchClasses = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<{ classes: ClassItem[] }>("/api/classes")
      setClasses(data.classes || [])
    } catch (err) { console.error("fetchClasses error:", err) } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchClasses() }, [fetchClasses])

  const handleCreate = async () => {
    if (!formName.trim()) return
    setSaving(true)
    try {
      await api.post("/api/classes", { name: formName, description: formDesc })
      setCreateDialog(false)
      setFormName("")
      setFormDesc("")
      fetchClasses()
    } catch (err) { console.error("handleCreate error:", err) } finally { setSaving(false) }
  }

  const handleEdit = async () => {
    if (!editDialog || !formName.trim()) return
    setSaving(true)
    try {
      await api.put(`/api/classes/${editDialog.id}`, { name: formName, description: formDesc })
      setEditDialog(null)
      fetchClasses()
    } catch (err) { console.error("handleEdit error:", err) } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除该班级？")) return
    try {
      await api.delete(`/api/classes/${id}`)
      fetchClasses()
    } catch (e: any) { alert(e.message) }
  }

  const openMembers = async (cls: ClassItem) => {
    setMemberDialog(cls)
    try {
      const data = await api.get<{ members: Member[] }>(`/api/classes/${cls.id}/members`)
      setMembers(data.members || [])
    } catch (err) { console.error("openMembers error:", err) }
  }

  const fetchStudents = async (search: string) => {
    setStudentLoading(true)
    try {
      const data = await api.get<{ users: { id: string; username: string }[] }>(
        "/api/admin/users",
        { params: { role: "STUDENT", limit: "100", search: search || undefined } }
      )
      setStudentList(data.users || [])
    } catch (err) { console.error("fetchStudents error:", err) } finally { setStudentLoading(false) }
  }

  const openStudentDialog = () => {
    setStudentSearch("")
    setStudentDialog(true)
    fetchStudents("")
  }

  const handleAddMember = async (userId: string) => {
    if (!memberDialog) return
    try {
      await api.post(`/api/classes/${memberDialog.id}/members`, { userId })
      // Refresh members list and remove this student from the selection list
      openMembers(memberDialog)
      setStudentList((prev) => prev.filter((s) => s.id !== userId))
    } catch (err) { console.error("handleAddMember error:", err) }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!memberDialog || !confirm("确定移除该学生？")) return
    try {
      await api.delete(`/api/classes/${memberDialog.id}/members`, { params: { userId } })
      openMembers(memberDialog)
    } catch (err) { console.error("handleRemoveMember error:", err) }
  }

  const handleGenInvite = async (cls: ClassItem) => {
    setInviteDialog(cls)
    setInviteCode("")
    setInviteError("")
    try {
      const data = await api.get<{ classCode?: { code: string } }>(`/api/classes/${cls.id}/class-code`)
      setInviteCode(data.classCode?.code || "")
    } catch (err: any) {
      setInviteError(err.message || "获取邀请码失败")
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">加载中...</p></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6" /> 班级管理</h1>
          <p className="text-muted-foreground mt-1">管理你的班级和学生</p>
        </div>
        <Button onClick={() => { setFormName(""); setFormDesc(""); setCreateDialog(true) }}>
          <Plus className="h-4 w-4 mr-1" /> 创建班级
        </Button>
      </div>

      {classes.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">暂无班级，点击上方创建</p></CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {classes.map((cls) => (
            <Card key={cls.id} className="hover:shadow-md transition">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium truncate flex-1">{cls.name}</h3>
                </div>
                {cls.teacher && (
                  <p className="text-xs text-muted-foreground mb-2">创建者: {cls.teacher.username}</p>
                )}
                {cls.description && <p className="text-sm text-muted-foreground mb-3">{cls.description}</p>}
                <div className="flex items-center gap-3 mb-3">
                  <Badge variant="secondary"><Users className="h-3 w-3 mr-1" />{cls._count.members}人</Badge>
                  <Badge variant="secondary">{cls._count.tasks}次考试</Badge>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openMembers(cls)}>
                    <Eye className="h-3 w-3 mr-1" /> 成员
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleGenInvite(cls)}>
                    <Copy className="h-3 w-3 mr-1" /> 邀请码
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditDialog(cls); setFormName(cls.name); setFormDesc(cls.description || "") }}>
                    编辑
                  </Button>
                  <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleDelete(cls.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>创建班级</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="班级名称" value={formName} onChange={(e) => setFormName(e.target.value)} />
            <Input placeholder="班级描述（可选）" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} />
          </div>
          <DialogFooter><Button onClick={handleCreate} disabled={saving || !formName.trim()}>{saving ? "创建中..." : "创建"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>编辑班级</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="班级名称" value={formName} onChange={(e) => setFormName(e.target.value)} />
            <Input placeholder="班级描述" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} />
          </div>
          <DialogFooter><Button onClick={handleEdit} disabled={saving || !formName.trim()}>{saving ? "保存中..." : "保存"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Members Dialog */}
      <Dialog open={!!memberDialog} onOpenChange={() => setMemberDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{memberDialog?.name} - 成员 ({members.length})</DialogTitle></DialogHeader>
          <div className="mb-3">
            <Button size="sm" variant="outline" onClick={openStudentDialog}>
              <Plus className="h-3 w-3 mr-1" /> 添加学生
            </Button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {members.length === 0 ? <p className="text-sm text-muted-foreground">暂无成员</p> :
              members.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-2 rounded border">
                  <span className="text-sm">{m.user.username}</span>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleRemoveMember(m.user.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))
            }
          </div>
        </DialogContent>
      </Dialog>

      {/* Student Selection Dialog */}
      <Dialog open={studentDialog} onOpenChange={setStudentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>选择学生</DialogTitle></DialogHeader>
          <div className="relative mb-2">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              className="w-full rounded-md border pl-8 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              placeholder="搜索学生用户名..."
              value={studentSearch}
              onChange={(e) => {
                setStudentSearch(e.target.value)
                fetchStudents(e.target.value)
              }}
            />
          </div>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {studentLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">加载中...</p>
            ) : studentList.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">未找到学生</p>
            ) : (
              studentList.map((s) => {
                const alreadyMember = members.some((m) => m.user.id === s.id)
                return (
                  <div key={s.id} className="flex items-center justify-between p-2 rounded border">
                    <span className="text-sm">{s.username}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={alreadyMember}
                      onClick={() => handleAddMember(s.id)}
                    >
                      {alreadyMember ? "已添加" : "添加"}
                    </Button>
                  </div>
                )
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite Code Dialog */}
      <Dialog open={!!inviteDialog} onOpenChange={() => { setInviteDialog(null); setInviteCode(""); setInviteError(""); setCopied(false) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>班级邀请码 - {inviteDialog?.name}</DialogTitle></DialogHeader>
          <div className="text-center py-4">
            {inviteError ? (
              <div className="space-y-3">
                <p className="text-sm text-destructive">{inviteError}</p>
                <Button variant="outline" size="sm" onClick={() => inviteDialog && handleGenInvite(inviteDialog)}>
                  重试
                </Button>
              </div>
            ) : inviteCode ? (
              <div className="space-y-3">
                <p
                  className="text-sm font-mono font-bold text-primary break-all cursor-pointer select-all bg-muted p-2 rounded"
                  title="点击选中后 Ctrl+C 手动复制"
                >
                  {inviteCode}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await copyCode(inviteCode)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}
                >
                  {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                  {copied ? "已复制" : "一键复制"}
                </Button>
                <p className="text-sm text-muted-foreground">学生输入此邀请码即可加入班级</p>
              </div>
            ) : <p className="text-sm text-muted-foreground">生成中...</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
