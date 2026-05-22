"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Users, Plus, Trash2, Copy, Eye, Search, Check } from "lucide-react"

interface ClassItem {
  id: string
  name: string
  description: string | null
  createdAt: string
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
  const [copied, setCopied] = useState(false)
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
      const token = localStorage.getItem("token")
      const res = await fetch("/api/classes", { headers: { Authorization: `Bearer ${token}` } })
      setClasses((await res.json()).classes || [])
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchClasses() }, [fetchClasses])

  const handleCreate = async () => {
    if (!formName.trim()) return
    setSaving(true)
    try {
      const token = localStorage.getItem("token")
      await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: formName, description: formDesc }),
      })
      setCreateDialog(false)
      setFormName("")
      setFormDesc("")
      fetchClasses()
    } catch {} finally { setSaving(false) }
  }

  const handleEdit = async () => {
    if (!editDialog || !formName.trim()) return
    setSaving(true)
    try {
      const token = localStorage.getItem("token")
      await fetch(`/api/classes/${editDialog.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: formName, description: formDesc }),
      })
      setEditDialog(null)
      fetchClasses()
    } catch {} finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除该班级？")) return
    try {
      const token = localStorage.getItem("token")
      await fetch(`/api/classes/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      fetchClasses()
    } catch (e: any) { alert(e.message) }
  }

  const openMembers = async (cls: ClassItem) => {
    setMemberDialog(cls)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/classes/${cls.id}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setMembers((await res.json()).members || [])
    } catch {}
  }

  const fetchStudents = async (search: string) => {
    setStudentLoading(true)
    try {
      const token = localStorage.getItem("token")
      const params = new URLSearchParams({ role: "STUDENT", limit: "100" })
      if (search) params.set("search", search)
      const res = await fetch(`/api/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setStudentList(data.users || [])
    } catch {} finally { setStudentLoading(false) }
  }

  const openStudentDialog = () => {
    setStudentSearch("")
    setStudentDialog(true)
    fetchStudents("")
  }

  const handleAddMember = async (userId: string) => {
    if (!memberDialog) return
    try {
      const token = localStorage.getItem("token")
      await fetch(`/api/classes/${memberDialog.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId }),
      })
      // Refresh members list and remove this student from the selection list
      openMembers(memberDialog)
      setStudentList((prev) => prev.filter((s) => s.id !== userId))
    } catch {}
  }

  const handleRemoveMember = async (userId: string) => {
    if (!memberDialog || !confirm("确定移除该学生？")) return
    try {
      const token = localStorage.getItem("token")
      await fetch(`/api/classes/${memberDialog.id}/members?userId=${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      openMembers(memberDialog)
    } catch {}
  }

  const handleGenInvite = async (cls: ClassItem) => {
    setInviteDialog(cls)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/classes/${cls.id}/class-code`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setInviteCode(data.classCode?.code || "")
    } catch {}
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
      <Dialog open={!!inviteDialog} onOpenChange={() => { setInviteDialog(null); setInviteCode(""); setCopied(false) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>班级邀请码 - {inviteDialog?.name}</DialogTitle></DialogHeader>
          <div className="text-center py-4">
            {inviteCode ? (
              <div className="space-y-3">
                <p className="text-2xl font-mono font-bold text-primary tracking-widest">
                  {inviteCode.length > 16
                    ? `${inviteCode.slice(0, 8)}...${inviteCode.slice(-4)}`
                    : inviteCode}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(inviteCode)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}
                >
                  {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                  {copied ? "已复制" : "复制完整邀请码"}
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
