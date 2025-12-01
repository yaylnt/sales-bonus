/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  // purchase — это одна из записей в поле items из чека в data.purchase_records
  // _product — это продукт из коллекции data.products
  const { discount, sale_price, quantity } = purchase;
  const discountRatio = 1 - discount / 100;
  return sale_price * quantity * discountRatio;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
  const { profit } = seller;
  if (index === 0) return profit * 0.15;
  if (index === 1 || index === 2) return profit * 0.1;
  if (index === total - 1) return 0;
  return profit * 0.05;
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
  const { calculateRevenue, calculateBonus } = options; // Сюда передадим функции для расчётов
  // Здесь проверим входящие данные
  if (
    !data ||
    !Array.isArray(data.sellers) ||
    !Array.isArray(data.products) ||
    !Array.isArray(data.purchase_records) ||
    data.sellers.length === 0 ||
    data.products.length === 0 ||
    data.purchase_records.length === 0
  ) {
    throw new Error("Некорректные входные данные");
  }

  if (
    typeof options?.calculateRevenue !== "function" ||
    typeof options?.calculateBonus !== "function"
  ) {
    throw new Error("Не переданы обязательные функции для расчетов");
  }

  // Здесь посчитаем промежуточные данные и отсортируем продавцов
  const sellerStats = data.sellers.map((seller) => ({
    id: seller.id,
    name: `${seller.first_name} ${seller.last_name}`,
    revenue: 0,
    profit: 0,
    sales_count: 0,
    products_sold: {},
  }));

  const sellerIndex = Object.fromEntries(
    sellerStats.map((item) => [item.id, item])
  );
  const productIndex = Object.fromEntries(
    data.products.map((item) => [item.sku, item])
  );

  data.purchase_records.forEach((record) => {
    // Чек
    const seller = sellerIndex[record.seller_id]; // Продавец
    seller.sales_count += 1;
    seller.revenue += record.total_amount - record.total_discount;

    // Расчёт прибыли для каждого товара
    record.items.forEach((item) => {
      const product = productIndex[item.sku]; // Товар
      const costs = product.purchase_price * item.quantity;
      const revenue = calculateRevenue(item, product);
      const profit = revenue - costs;
      seller.profit += profit;

      // Учёт количества проданных товаров
      if (!seller.products_sold[item.sku]) {
        seller.products_sold[item.sku] = 0;
      }
      seller.products_sold[item.sku] += item.quantity;
    });

    sellerStats.sort((a, b) => b.profit - a.profit);
    sellerStats.forEach((seller, index) => {
      seller.bonus = calculateBonus(index, sellerStats.length, seller); // Считаем бонус

      // Формируем топ-10 товаров
      seller.top_products = Object.entries(seller.products_sold)
        .map(([sku, quantity]) => ({ sku, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);
    });
  });

  return sellerStats.map((seller) => ({
    seller_id: seller.id, // Строка, идентификатор продавца
    name: seller.name, // Строка, имя продавца
    revenue: +seller.revenue.toFixed(2), // Число с двумя знаками после точки, выручка продавца
    profit: +seller.profit.toFixed(2), // Число с двумя знаками после точки, прибыль продавца
    sales_count: seller.sales_count, // Целое число, количество продаж продавца
    top_products: seller.top_products, // Массив объектов вида: { "sku": "SKU_008","quantity": 10}, топ-10 товаров продавца
    bonus: +seller.bonus.toFixed(2), // Число с двумя знаками после точки, бонус продавца
  }));
}
