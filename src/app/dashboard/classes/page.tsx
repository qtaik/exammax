"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { School, Users, User } from "lucide-react"

interface ClassItem {
  id: string; name: string; description: string | null
  teacher: { id: string; username: string }
  _count: { members: number }
}

export default function StudentClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [loading, setLoading] = useState(true)

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

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">加载中...</p></div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><School className="h-6 w-6" /> 我的班级</h1>
        <p className="text-muted-foreground mt-1">查看你已加入的班级</p>
      </div>

      {classes.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <p className="text-muted-foreground">你还没有加入任何班级</p>
          <p className="text-xs text-muted-foreground mt-1">请联系教师获取班级邀请码</p>
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
    </div>
  )
}
