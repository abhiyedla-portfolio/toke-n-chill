import { NextRequest, NextResponse } from 'next/server';
import {
  getAllProducts,
  getProductsByCategory,
  getFeaturedProducts,
} from '@/lib/products-service';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const category = searchParams.get('category');
  const featured = searchParams.get('featured');

  try {
    let products;

    if (featured === 'true') {
      products = await getFeaturedProducts();
    } else if (category) {
      products = await getProductsByCategory(category);
    } else {
      products = await getAllProducts();
    }

    return NextResponse.json({ products, count: products.length });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 },
    );
  }
}
