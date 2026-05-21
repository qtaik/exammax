import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import crypto from 'crypto'

const prisma = new PrismaClient()

function generateInvitationCode(): string {
  const randomBytes = crypto.randomBytes(32).toString('hex')
  return `exam_${randomBytes}`
}

async function main() {
  console.log('开始初始化数据...')

  // 创建管理员邀请码
  const adminInvitationCode = generateInvitationCode()
  const adminInvitation = await prisma.invitationCode.create({
    data: {
      code: adminInvitationCode,
      role: 'ADMIN',
      expiresAt: new Date('2026-12-31'),
    },
  })
  console.log('管理员邀请码创建成功:', adminInvitationCode)

  // 创建管理员账户
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

  // 绑定管理员邀请码
  await prisma.invitationCode.update({
    where: { id: adminInvitation.id },
    data: {
      status: 'USED',
      usedById: admin.id,
      usedAt: new Date(),
    },
  })
  console.log('管理员账户创建成功: admin')

  // 创建教师邀请码
  const teacherInvitationCode = generateInvitationCode()
  const teacherInvitation = await prisma.invitationCode.create({
    data: {
      code: teacherInvitationCode,
      role: 'TEACHER',
      expiresAt: new Date('2026-12-31'),
    },
  })
  console.log('教师邀请码创建成功:', teacherInvitationCode)

  // 创建测试教师账户
  const teacherPassword = await hash('teacher123', 12)
  const teacher = await prisma.user.upsert({
    where: { username: 'teacher' },
    update: {},
    create: {
      username: 'teacher',
      passwordHash: teacherPassword,
      role: 'TEACHER',
    },
  })

  // 绑定教师邀请码
  await prisma.invitationCode.update({
    where: { id: teacherInvitation.id },
    data: {
      status: 'USED',
      usedById: teacher.id,
      usedAt: new Date(),
    },
  })
  console.log('教师账户创建成功: teacher')

  // 创建学生邀请码
  const studentCodes = []
  for (let i = 0; i < 5; i++) {
    const code = generateInvitationCode()
    await prisma.invitationCode.create({
      data: {
        code,
        role: 'STUDENT',
        expiresAt: new Date('2026-12-31'),
      },
    })
    studentCodes.push(code)
  }
  console.log('学生邀请码创建成功:', studentCodes.length, '个')

  // 创建默认分类
  await prisma.category.upsert({
    where: { name: '默认' },
    update: {},
    create: { name: '默认', description: '未分类题目' },
  })
  console.log('默认分类创建成功')

  // 创建徽章
  const badges = [
    { name: '初出茅庐', icon: '🌱', description: '完成第一道题目', condition: JSON.stringify({ type: 'answer_count', count: 1 }) },
    { name: '勤学好问', icon: '📚', description: '累计答题10道', condition: JSON.stringify({ type: 'answer_count', count: 10 }) },
    { name: '百炼成钢', icon: '💪', description: '累计答题100道', condition: JSON.stringify({ type: 'answer_count', count: 100 }) },
    { name: '连续签到3天', icon: '🔥', description: '连续签到3天', condition: JSON.stringify({ type: 'streak', days: 3 }) },
    { name: '连续签到7天', icon: '⭐', description: '连续签到7天', condition: JSON.stringify({ type: 'streak', days: 7 }) },
    { name: '连续签到30天', icon: '👑', description: '连续签到30天', condition: JSON.stringify({ type: 'streak', days: 30 }) },
    { name: '正确率90%', icon: '🎯', description: '答题正确率达到90%', condition: JSON.stringify({ type: 'accuracy', rate: 90 }) },
    { name: '答题达人', icon: '🔢', description: '累计答对50道题', condition: JSON.stringify({ type: 'correct_count', count: 50 }) },
  ]
  for (const badge of badges) {
    await prisma.badge.upsert({ where: { name: badge.name }, update: {}, create: badge })
  }
  console.log('徽章创建成功:', badges.length, '个')

  // 创建商店物品
  const shopItems = [
    { name: '铜牌勋章', type: 'MEDAL' as const, price: 100, description: '入门级勋章', icon: '🥉' },
    { name: '银牌勋章', type: 'MEDAL' as const, price: 300, description: '进阶勋章', icon: '🥈' },
    { name: '金牌勋章', type: 'MEDAL' as const, price: 500, description: '高级勋章', icon: '🥇' },
    { name: '钻石勋章', type: 'MEDAL' as const, price: 1000, description: '稀有勋章', icon: '💎' },
    { name: '学习新手', type: 'TITLE' as const, price: 50, description: '称号：学习新手', icon: '📖' },
    { name: '学霸', type: 'TITLE' as const, price: 500, description: '称号：学霸', icon: '🎓' },
    { name: '学神', type: 'TITLE' as const, price: 2000, description: '称号：学神', icon: '🏆' },
  ]
  for (const item of shopItems) {
    await prisma.shopItem.upsert({ where: { name: item.name }, update: {}, create: item })
  }
  console.log('商店物品创建成功:', shopItems.length, '个')

  console.log('数据初始化完成！')
  console.log('')
  console.log('默认账户信息:')
  console.log('管理员: admin / admin123')
  console.log('教师: teacher / teacher123')
  console.log('')
  console.log('管理员邀请码:', adminInvitationCode)
  console.log('教师邀请码:', teacherInvitationCode)
  console.log('学生邀请码:', studentCodes.join('\n'))
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
