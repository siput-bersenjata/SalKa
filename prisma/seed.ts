import { PrismaClient, Role, AccountStatus, PaymentMethod } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash("admin123", salt);
  const kasirPasswordHash = await bcrypt.hash("kasir123", salt);

  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const tenYearsLater = new Date(now.getTime() + 10 * 365 * 24 * 60 * 60 * 1000);

  // 1. Seed Super Admin
  const adminUser = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash: adminPasswordHash,
      fullName: "Super Administrator",
      phone: "081299998888",
      role: Role.SUPER_ADMIN,
      accountStatus: AccountStatus.ACTIVE,
      trialExpiresAt: tenYearsLater,
      subscriptionUntil: tenYearsLater,
      notes: "Akun Super Admin Sistem SalKa",
    },
  });
  console.log("Super Admin created:", adminUser.username);

  // 2. Seed Demo Cashier / Store Owner
  const demoOwner = await prisma.user.upsert({
    where: { username: "kasir1" },
    update: {},
    create: {
      username: "kasir1",
      passwordHash: kasirPasswordHash,
      fullName: "Budi Santoso",
      phone: "081234567890",
      role: Role.STORE_OWNER,
      accountStatus: AccountStatus.TRIAL,
      trialExpiresAt: thirtyDaysLater,
      notes: "Akun Demo Toko Kasir Sumber Rejeki (Trial 30 Hari)",
    },
  });
  console.log("Demo Owner created:", demoOwner.username);

  // 3. Create Store
  let store = await prisma.store.findFirst({
    where: { userId: demoOwner.id },
  });

  if (!store) {
    store = await prisma.store.create({
      data: {
        userId: demoOwner.id,
        name: "Toko Sumber Rejeki",
        address: "Jl. Sudirman No. 45, Jakarta",
        phone: "081234567890",
        receiptHeader: "Toko Sumber Rejeki - Terima Kasih!",
        receiptFooter: "Barang yang sudah dibeli tidak dapat ditukar/dikembalikan",
        paperSize: "58mm",
      },
    });
    console.log("Store created:", store.name);
  }

  // 4. Create Categories
  const categoryNames = ["Minuman", "Makanan", "Snack", "Lainnya"];
  const categories: Record<string, string> = {};

  for (const name of categoryNames) {
    let cat = await prisma.category.findFirst({
      where: { storeId: store.id, name },
    });
    if (!cat) {
      cat = await prisma.category.create({
        data: {
          storeId: store.id,
          name,
        },
      });
    }
    categories[name] = cat.id;
  }
  console.log("Categories seeded");

  // 5. Create Products (Matching Image 1 & 2)
  const initialProducts = [
    {
      name: "Air Mineral 600ml",
      price: 3000,
      costPrice: 2000,
      stock: 72,
      minStock: 5,
      categoryId: categories["Minuman"],
      barcode: "899123456001",
    },
    {
      name: "Teh Botol",
      price: 4000,
      costPrice: 2800,
      stock: 45,
      minStock: 5,
      categoryId: categories["Minuman"],
      barcode: "899123456002",
    },
    {
      name: "Indomie Goreng",
      price: 3500,
      costPrice: 2500,
      stock: 5,
      minStock: 5,
      categoryId: categories["Makanan"],
      barcode: "899123456003",
    },
    {
      name: "Roti Tawar",
      price: 8000,
      costPrice: 6000,
      stock: 6,
      minStock: 5,
      categoryId: categories["Makanan"],
      barcode: "899123456004",
    },
    {
      name: "Kopi Sachet",
      price: 2000,
      costPrice: 1200,
      stock: 8,
      minStock: 5,
      categoryId: categories["Minuman"],
      barcode: "899123456005",
    },
    {
      name: "Susu UHT",
      price: 5000,
      costPrice: 3800,
      stock: 30,
      minStock: 5,
      categoryId: categories["Minuman"],
      barcode: "899123456006",
    },
  ];

  for (const prod of initialProducts) {
    const existing = await prisma.product.findFirst({
      where: { storeId: store.id, name: prod.name },
    });
    if (!existing) {
      await prisma.product.create({
        data: {
          storeId: store.id,
          ...prod,
        },
      });
    }
  }
  console.log("Products seeded");

  // 6. Sample Transactions
  const existingTrxCount = await prisma.transaction.count({
    where: { storeId: store.id },
  });

  if (existingTrxCount === 0) {
    const airMineral = await prisma.product.findFirst({ where: { storeId: store.id, name: "Air Mineral 600ml" } });
    const tehBotol = await prisma.product.findFirst({ where: { storeId: store.id, name: "Teh Botol" } });
    const indomie = await prisma.product.findFirst({ where: { storeId: store.id, name: "Indomie Goreng" } });

    const sampleTransactions = [
      {
        invoiceNumber: "TRX20260930048",
        totalAmount: 42000,
        paidAmount: 50000,
        changeAmount: 8000,
        paymentMethod: PaymentMethod.CASH,
        createdAt: new Date(now.getTime() - 20 * 60 * 1000),
        items: [
          { productId: airMineral?.id, productName: "Air Mineral 600ml", price: 3000, quantity: 4, subtotal: 12000 },
          { productId: tehBotol?.id, productName: "Teh Botol", price: 4000, quantity: 5, subtotal: 20000 },
          { productId: indomie?.id, productName: "Indomie Goreng", price: 3500, quantity: 2, subtotal: 7000 },
        ],
      },
      {
        invoiceNumber: "TRX20260930047",
        totalAmount: 67000,
        paidAmount: 67000,
        changeAmount: 0,
        paymentMethod: PaymentMethod.QRIS,
        createdAt: new Date(now.getTime() - 60 * 60 * 1000),
        items: [
          { productId: airMineral?.id, productName: "Air Mineral 600ml", price: 3000, quantity: 5, subtotal: 15000 },
          { productId: tehBotol?.id, productName: "Teh Botol", price: 4000, quantity: 8, subtotal: 32000 },
          { productId: indomie?.id, productName: "Indomie Goreng", price: 3500, quantity: 4, subtotal: 14000 },
        ],
      },
      {
        invoiceNumber: "TRX20260930046",
        totalAmount: 23500,
        paidAmount: 30000,
        changeAmount: 6500,
        paymentMethod: PaymentMethod.CASH,
        createdAt: new Date(now.getTime() - 120 * 60 * 1000),
        items: [
          { productId: airMineral?.id, productName: "Air Mineral 600ml", price: 3000, quantity: 3, subtotal: 9000 },
          { productId: indomie?.id, productName: "Indomie Goreng", price: 3500, quantity: 3, subtotal: 10500 },
        ],
      },
      {
        invoiceNumber: "TRX20260930045",
        totalAmount: 56000,
        paidAmount: 56000,
        changeAmount: 0,
        paymentMethod: PaymentMethod.QRIS,
        createdAt: new Date(now.getTime() - 180 * 60 * 1000),
        items: [
          { productId: tehBotol?.id, productName: "Teh Botol", price: 4000, quantity: 10, subtotal: 40000 },
          { productId: airMineral?.id, productName: "Air Mineral 600ml", price: 3000, quantity: 4, subtotal: 12000 },
        ],
      },
      {
        invoiceNumber: "TRX20260930044",
        totalAmount: 31000,
        paidAmount: 50000,
        changeAmount: 19000,
        paymentMethod: PaymentMethod.CASH,
        createdAt: new Date(now.getTime() - 240 * 60 * 1000),
        items: [
          { productId: indomie?.id, productName: "Indomie Goreng", price: 3500, quantity: 6, subtotal: 21000 },
          { productId: airMineral?.id, productName: "Air Mineral 600ml", price: 3000, quantity: 2, subtotal: 6000 },
        ],
      },
    ];

    for (const trx of sampleTransactions) {
      await prisma.transaction.create({
        data: {
          invoiceNumber: trx.invoiceNumber,
          storeId: store.id,
          totalAmount: trx.totalAmount,
          paidAmount: trx.paidAmount,
          changeAmount: trx.changeAmount,
          paymentMethod: trx.paymentMethod,
          cashierName: "Kasir 1",
          createdAt: trx.createdAt,
          items: {
            create: trx.items,
          },
        },
      });
    }
    console.log("Sample transactions seeded");
  }

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
