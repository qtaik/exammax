import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import crypto from 'crypto'

const prisma = new PrismaClient()

function generateCode(prefix: string): string {
  const randomBytes = crypto.randomBytes(32).toString('hex')
  return `${prefix}${randomBytes}`
}

async function main() {
  console.log('开始初始化数据...')

  // 创建管理员账户（不绑定账户码，永不过期）
  const adminPassword = await hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: adminPassword,
      role: 'ADMIN',
    },
  })
  console.log('管理员账户创建成功: admin (admin123)')

  // 创建教师账户码
  const teacherCode = generateCode('exam_')
  const teacherAccountCode = await prisma.accountCode.create({
    data: {
      code: teacherCode,
      role: 'TEACHER',
      expiresAt: new Date('2026-12-31'),
    },
  })
  console.log('教师账户码创建成功:', teacherCode)

  // 创建测试教师账户（绑定账户码）
  const teacherPassword = await hash('teacher123', 12)
  const teacher = await prisma.user.upsert({
    where: { username: 'teacher' },
    update: {},
    create: {
      username: 'teacher',
      passwordHash: teacherPassword,
      role: 'TEACHER',
      accountCodeId: teacherAccountCode.id,
    },
  })
  console.log('教师账户创建成功: teacher (teacher123)')

  // 创建学生账户码（未绑定）
  const studentCodes = []
  for (let i = 0; i < 5; i++) {
    const code = generateCode('exam_')
    await prisma.accountCode.create({
      data: {
        code,
        role: 'STUDENT',
        expiresAt: new Date('2026-12-31'),
      },
    })
    studentCodes.push(code)
  }
  console.log('学生账户码创建成功:', studentCodes.length, '个')

  // 创建默认分类
  await prisma.category.upsert({
    where: { name: '默认' },
    update: {},
    create: { name: '默认', description: '未分类题目' },
  })
  console.log('默认分类创建成功')

  // 创建徽章（7个成就徽章）
  const badges = [
    { name: '我上我也行', icon: '🆗', description: '完成第一道题目', condition: JSON.stringify({ type: 'answer_count', count: 1 }) },
    { name: '扶我起来还能再刷', icon: '🔄', description: '累计答题10道', condition: JSON.stringify({ type: 'answer_count', count: 10 }) },
    { name: '键盘冒烟了', icon: '⌨️', description: '累计答题100道', condition: JSON.stringify({ type: 'answer_count', count: 100 }) },
    { name: '难道我真的这么废柴吗？', icon: '😭', description: '正确率达到20%', condition: JSON.stringify({ type: 'accuracy', rate: 20 }) },
    { name: '好像有点东西', icon: '🤔', description: '正确率达到50%', condition: JSON.stringify({ type: 'accuracy', rate: 50 }) },
    { name: '出题老师你过来一下', icon: '💢', description: '正确率达到90%', condition: JSON.stringify({ type: 'accuracy', rate: 90 }) },
    { name: '对王之王', icon: '👑', description: '累计答对50道题', condition: JSON.stringify({ type: 'correct_count', count: 50 }) },
  ]
  for (const badge of badges) {
    await prisma.badge.upsert({ where: { name: badge.name }, update: {}, create: badge })
  }
  console.log('徽章创建成功:', badges.length, '个')

  // 创建称号（6常驻商城 + 4限定抽奖）
  const shopItems = [
    { name: '哈基米', type: 'TITLE' as const, price: 200, description: '称号：哈基米', icon: '🐱', limited: false },
    { name: '我的刀盾', type: 'TITLE' as const, price: 300, description: '称号：我的刀盾', icon: '🛡️', limited: false },
    { name: '比比拉布', type: 'TITLE' as const, price: 400, description: '称号：比比拉布', icon: '💕', limited: false },
    { name: '咕咕嘎嘎', type: 'TITLE' as const, price: 500, description: '称号：咕咕嘎嘎', icon: '🦆', limited: false },
    { name: '古希腊掌管摆烂的神', type: 'TITLE' as const, price: 800, description: '称号：古希腊掌管摆烂的神', icon: '🏛️', limited: false },
    { name: '尊嘟假嘟', type: 'TITLE' as const, price: 1000, description: '称号：尊嘟假嘟', icon: '🤨', limited: false },
    { name: '命运的齿轮开始转动', type: 'TITLE' as const, price: 0, description: '限定称号：命运的齿轮开始转动', icon: '⚙️', limited: true },
    { name: '被选召的孩子', type: 'TITLE' as const, price: 0, description: '限定称号：被选召的孩子', icon: '🌟', limited: true },
    { name: '此号已开光', type: 'TITLE' as const, price: 0, description: '限定称号：此号已开光', icon: '✨', limited: true },
    { name: '服务器の守護神', type: 'TITLE' as const, price: 0, description: '限定称号：服务器の守護神', icon: '🏰', limited: true },
  ]
  for (const item of shopItems) {
    await prisma.shopItem.upsert({ where: { name: item.name }, update: {}, create: item })
  }
  console.log('商店物品创建成功:', shopItems.length, '个')

  console.log('数据初始化完成！')
  console.log('')
  console.log('默认账户信息:')
  console.log('管理员: admin / admin123 (不绑码，永不过期)')
  console.log('教师: teacher / teacher123')
  console.log('')
  console.log('教师账户码:', teacherCode)
  console.log('学生账户码:')
  studentCodes.forEach(c => console.log(' ', c))
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
