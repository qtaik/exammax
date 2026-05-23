"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sparkles, Coins, TrendingUp, Gift, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Sparkles }> = {
  nothing: { label: "谢谢参与", color: "text-muted-foreground", bg: "bg-muted", icon: Sparkles },
  common: { label: "经典时尚小垃圾", color: "text-green-600", bg: "bg-green-50", icon: Gift },
  rare: { label: "好像有点用", color: "text-blue-600", bg: "bg-blue-50", icon: TrendingUp },
  legendary: { label: "金色传说", color: "text-yellow-600", bg: "bg-yellow-50", icon: Star },
}

const REWARD_LABELS: Record<string, string> = {
  points: "积分",
  exp: "经验值",
  title: "称号",
}

export default function LotteryPage() {
  const [points, setPoints] = useState(0)
  const [pityCounter, setPityCounter] = useState(0)
  const [loading, setLoading] = useState(true)
  const [drawing, setDrawing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [showResult, setShowResult] = useState(false)

  const fetchState = useCallback(async () => {
    try {
      const data = await api.get<{ points: number; pityCounter: number }>("/api/lottery")
      setPoints(data.points)
      setPityCounter(data.pityCounter)
    } catch {} finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchState() }, [fetchState])

  const handleDraw = async () => {
    if (drawing || points < 50) return
    setDrawing(true)
    try {
      const data = await api.post<{
        success: boolean
        result: any
        pityCounter: number
      }>("/api/lottery/draw")
      setResult(data.result)
      setPityCounter(data.pityCounter)
      setPoints((p) => p - 50 + (data.result.rewardType === "points" ? data.result.value : 0))
      setShowResult(true)
    } catch (e: any) {
      alert(e?.message || "抽奖失败")
    } finally {
      setDrawing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    )
  }

  const pityPercent = Math.min((pityCounter / 30) * 100, 100)
  const tierCfg = result ? TIER_CONFIG[result.tier] : null

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <Sparkles className="h-6 w-6" />
        积分抽奖
      </h2>

      {/* Points & Pity */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground text-sm mb-1">
              <Coins className="h-4 w-4" />
              我的积分
            </div>
            <p className="text-2xl font-bold">{points}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground text-sm mb-1">
              <Star className="h-4 w-4" />
              保底进度
            </div>
            <p className="text-2xl font-bold">
              {pityCounter}<span className="text-sm text-muted-foreground">/30</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pity bar */}
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full transition-all duration-500", pityPercent >= 100 ? "bg-yellow-500" : "bg-primary")}
          style={{ width: `${pityPercent}%` }}
        />
      </div>

      {/* Draw Button */}
      <Button
        size="lg"
        className="w-full h-16 text-lg font-bold"
        onClick={handleDraw}
        disabled={drawing || points < 50}
      >
        {drawing ? (
          <span className="animate-pulse">抽奖中...</span>
        ) : points < 50 ? (
          "积分不足 (需要50积分)"
        ) : (
          <>
            <Sparkles className="h-5 w-5 mr-2" />
            消耗50积分抽一次
          </>
        )}
      </Button>

      {/* Rate Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">奖池概率</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1"><Star className="h-3 w-3 text-yellow-500" /> 金色传说</span>
            <span className="text-muted-foreground">~2% (30抽保底)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3 text-blue-500" /> 好像有点用</span>
            <span className="text-muted-foreground">~28%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1"><Gift className="h-3 w-3 text-green-500" /> 经典时尚小垃圾</span>
            <span className="text-muted-foreground">~68%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" /> 谢谢参与</span>
            <span className="text-muted-foreground">~2%</span>
          </div>
        </CardContent>
      </Card>

      {/* Result Dialog */}
      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>抽奖结果</DialogTitle>
          </DialogHeader>
          {result && (
            <div className="text-center space-y-4 py-4">
              <div className={cn("text-lg font-bold", tierCfg?.color)}>
                {tierCfg?.label}
              </div>
              {result.rewardType === "points" && (
                <div className="flex items-center justify-center gap-2">
                  <Coins className="h-8 w-8 text-yellow-500" />
                  <span className="text-3xl font-bold">+{result.value} 积分</span>
                </div>
              )}
              {result.rewardType === "exp" && (
                <div className="flex items-center justify-center gap-2">
                  <TrendingUp className="h-8 w-8 text-blue-500" />
                  <span className="text-3xl font-bold">+{result.value} 经验</span>
                </div>
              )}
              {result.rewardType === "title" && result.title && (
                <div className="space-y-2">
                  <Star className="h-12 w-12 text-yellow-500 mx-auto" />
                  <div className="text-2xl font-bold text-yellow-600">
                    {result.title.icon} {result.title.name}
                  </div>
                  <Badge variant="secondary">限定称号</Badge>
                </div>
              )}
              {result.tier === "nothing" && (
                <p className="text-muted-foreground">再接再厉！</p>
              )}
              <Button className="w-full" onClick={() => setShowResult(false)}>
                确定
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
