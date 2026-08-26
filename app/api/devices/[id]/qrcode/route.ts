import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import QRCode from 'qrcode';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { id } = await params;
    const device = await prisma.device.findUnique({
      where: { id },
      select: { id: true, assetTag: true, qrCodeValue: true, brand: true, model: true },
    });

    if (!device) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Device not found' } },
        { status: 404 }
      );
    }

    // Generate high-resolution QR code data URL
    const qrDataUrl = await QRCode.toDataURL(device.qrCodeValue, {
      width: 400,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        deviceId: device.id,
        assetTag: device.assetTag,
        qrCodeValue: device.qrCodeValue,
        qrDataUrl,
      },
    });
  } catch (error: any) {
    console.error('Error generating QR code:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
