"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShoppingBag, Coins, Medal, Tag, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"

interface ShopItem {
  id: string
  name: string
  type: string
  price: number
  description: string | null
  icon: string | null
  limited: boolean
  purchased: boolean
}

interface ShopData {
  items: ShopItem[]
  userPoints: number
}

export default function ShopPage() {
  const [shopData, setShopData] = useState<ShopData | null>(null)
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [confirmItem, setConfirmItem] = useState<ShopItem | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const fetchShop = async () => {
    try {
      const data = await api.get<ShopData>("/api/shop")
      setShopData(data)
    } catch (err) { console.error("Shop fetch error:", err) } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchShop()
  }, [])

  const handlePurchase = async (item: ShopItem) => {
    setPurchasing(item.id)
    setError("")
    setSuccess("")

    try {
      await api.post("/api/shop", { itemId: item.id })
      setSuccess(`成功兑换 "${item.name}"!`)
      setConfirmItem(null)
      // Refresh shop data
      await fetchShop()
    } catch (e: any) {
      setError(e.message || "兑换失败")
      setConfirmItem(null)
    } finally {
      setPurchasing(null)
    }
  }

  const typeLabels: Record<string, string> = {
    MEDAL: "勋章",
    TITLE: "称号",
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <ShoppingBag className="h-6 w-6" />
        积分商店
      </h2>

      {/* Points display */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Coins className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-sm text-muted-foreground">我的积分</p>
              <p className="text-3xl font-bold">{shopData?.userPoints ?? 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Messages */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-center">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-green-800 text-center">
          {success}
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmItem && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium mb-1">确认兑换</p>
                <p className="text-sm text-muted-foreground mb-3">
                  确定要花费 {confirmItem.price} 积分兑换 &ldquo;{confirmItem.name}&rdquo; 吗？
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handlePurchase(confirmItem)}
                    disabled={purchasing === confirmItem.id}
                  >
                    {purchasing === confirmItem.id ? "兑换中..." : "确认兑换"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirmItem(null)}
                    disabled={purchasing === confirmItem.id}
                  >
                    取消
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items Grid */}
      {!shopData?.items || shopData.items.filter(i => !i.limited).length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>商店暂无可兑换商品</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shopData.items.filter(i => !i.limited).map((item) => {
            const canAfford = (shopData?.userPoints ?? 0) >= item.price
            const canPurchase = !item.purchased && canAfford

            return (
              <Card
                key={item.id}
                className={cn(
                  "transition-all hover:shadow-md",
                  item.purchased && "opacity-75"
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {item.icon ? (
                        <span className="text-3xl">{item.icon}</span>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          {item.type === "MEDAL" ? (
                            <Medal className="h-5 w-5 text-primary" />
                          ) : (
                            <Tag className="h-5 w-5 text-primary" />
                          )}
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-base">{item.name}</CardTitle>
                        <Badge variant="outline" className="text-xs mt-1">
                          {typeLabels[item.type] || item.type}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {item.description && (
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  )}

                  <div className="flex items-center gap-1 text-amber-600">
                    <Coins className="h-4 w-4" />
                    <span className="font-bold">{item.price}</span>
                    <span className="text-xs text-muted-foreground">积分</span>
                  </div>

                  {item.purchased ? (
                    <Button className="w-full" disabled variant="secondary">
                      已拥有
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      disabled={!canPurchase}
                      onClick={() => setConfirmItem(item)}
                    >
                      {!canAfford ? "积分不足" : "兑换"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
