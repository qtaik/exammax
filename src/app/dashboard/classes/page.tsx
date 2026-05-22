"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { School, Users, User, LogIn, Copy } from "lucide-react"

interface ClassItem {
  id: string; name: string; description: string | null
  teacher: { id: string; username: string }
  _count: { members: number }
}

export default function StudentClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteDialog, setInviteDialog] = useState(false)
  const [inviteCode, setInviteCode] = useState("")
  const [joining, setJoining] = useState(false)
  const [joinResult, setJoinResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const fetchClasses = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/classes", {
        headers: { Authorization: `Bearer ${token}` },
      })
      setClasses((await res.json()).classes || [])
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchClasses() }, [fetchClasses])

  const handleJoin = async () => {
    if (!inviteCode.trim()) return
    setJoining(true)
    setJoinResult(null)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/classes/join-by-code", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: inviteCode.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setJoinResult({ ok: true, msg: `成功加入：${data.className}` })
        setInviteCode("")
        fetchClasses()
      } else {
        setJoinResult({ ok: false, msg: data.error || "加入失败" })
      }
    } catch {
      setJoinResult({ ok: false, msg: "网络错误" })
    } finally { setJoining(false) }
  }

  const openInvite = () => {
    setInviteCode("")
    setJoinResult(null)
    setInviteDialog(true)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">加载中...</p></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><School className="h-6 w-6" /> 我的班级</h1>
          <p className="text-muted-foreground mt-1">查看你已加入的班级</p>
        </div>
        <Button onClick={openInvite}>
          <LogIn className="h-4 w-4 mr-1" /> 加入班级
        </Button>
      </div>

      {classes.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <p className="text-muted-foreground">你还没有加入任何班级</p>
          <p className="text-xs text-muted-foreground mt-1">点击上方"加入班级"输入教师提供的邀请码</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {classes.map((cls) => (
            <Card key={cls.id}>
              <CardContent className="p-4">
                <h3 className="font-medium truncate">{cls.name}</h3>
                {cls.description && (
                  <p className="text-sm text-muted-foreground mt-1">{cls.description}</p>
                )}
                <div className="flex items-center gap-3 mt-3">
                  <Badge variant="secondary">
                    <User className="h-3 w-3 mr-1" />教师: {cls.teacher.username}
                  </Badge>
                  <Badge variant="secondary">
                    <Users className="h-3 w-3 mr-1" />{cls._count.members}人
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Invite Code Dialog */}
      <Dialog open={inviteDialog} onOpenChange={setInviteDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>加入班级</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">输入教师提供的班级邀请码</p>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => { setInviteCode(e.target.value); setJoinResult(null) }}
              onKeyDown={(e) => { if (e.key === "Enter") handleJoin() }}
              placeholder="请输入邀请码"
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
            {joinResult && (
              <div className={`text-sm rounded-md p-2 ${
                joinResult.ok ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                  : "bg-destructive/10 text-destructive"
              }`}>
                {joinResult.msg}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleJoin} disabled={joining || !inviteCode.trim()}>
              {joining ? "加入中..." : "确认加入"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
