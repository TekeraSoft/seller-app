import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Fonts } from '@/constants/theme';
import { useAppSelector } from '@/store/hooks';

export default function OrderDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const orderId = typeof params.id === 'string' ? params.id : '';
  const order = useAppSelector((state) => state.orders.items.find((item) => item.id === orderId));

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 2,
    }).format(value);

  const formatDate = (value: string | null) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'full', timeStyle: 'short' }).format(date);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <Stack.Screen options={{ title: order ? `#${order.orderNo}` : 'Sipariş Detayı' }} />
      {!order ? (
        <View style={styles.emptyWrap}>
          <AppText style={styles.emptyText}>Sipariş detayı bulunamadı. Listeyi yenileyip tekrar dene.</AppText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.infoCard}>
            <AppText style={styles.sectionTitle} tone="rounded">
              Sipariş Bilgisi
            </AppText>
            <Row label="Sipariş No" value={`#${order.orderNo}`} />
            <Row label="Alıcı" value={order.buyerName} />
            <Row label="Telefon" value={order.buyerPhone} />
            <Row label="Tarih" value={formatDate(order.createdAt)} />
            <Row label="Durum" value={order.displayStatus ?? order.sellerOrderStatus ?? '-'} />
            <Row label="Ödeme" value={order.paymentStatus ?? '-'} />
          </View>

          <View style={styles.infoCard}>
            <AppText style={styles.sectionTitle} tone="rounded">
              Ürünler
            </AppText>
            {order.items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemImageWrap}>
                  {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.itemImage} resizeMode="cover" />
                  ) : (
                    <Ionicons name="image-outline" size={15} color="#A2A2AB" />
                  )}
                </View>
                <View style={styles.itemMain}>
                  <AppText style={styles.itemName}>{item.name}</AppText>
                  <AppText style={styles.itemMeta}>
                    {item.quantity} adet x {formatCurrency(item.unitPrice)}
                  </AppText>
                </View>
                <AppText style={styles.itemTotal} tone="rounded">
                  {formatCurrency(item.lineTotal)}
                </AppText>
              </View>
            ))}
          </View>

          <View style={styles.infoCard}>
            <AppText style={styles.sectionTitle} tone="rounded">
              Tutarlar
            </AppText>
            <Row label="Ürün Toplamı" value={formatCurrency(order.totalPrice)} />
            <Row label="Kargo" value={formatCurrency(order.shippingPrice)} />
            <Row label="Tahsil Edilecek" value={formatCurrency(order.payableTotalPrice)} strong />
          </View>

          <View style={styles.infoCard}>
            <AppText style={styles.sectionTitle} tone="rounded">
              Teslimat Adresi
            </AppText>
            {order.shippingAddress ? (
              <AddressBlock
                city={order.shippingAddress.city}
                street={order.shippingAddress.street}
                detail={order.shippingAddress.detailAddress}
                buildNo={order.shippingAddress.buildNo}
                doorNumber={order.shippingAddress.doorNumber}
                postalCode={order.shippingAddress.postalCode}
              />
            ) : (
              <AppText style={styles.addressText}>Adres bilgisi yok.</AppText>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <AppText style={styles.rowLabel}>{label}</AppText>
      <AppText style={[styles.rowValue, strong && styles.rowValueStrong]} tone={strong ? 'rounded' : 'sans'}>
        {value}
      </AppText>
    </View>
  );
}

function AddressBlock({
  city,
  street,
  detail,
  buildNo,
  doorNumber,
  postalCode,
}: {
  city: string;
  street: string;
  detail: string;
  buildNo: string;
  doorNumber: string;
  postalCode: string | null;
}) {
  return (
    <View style={styles.addressWrap}>
      <AppText style={styles.addressText}>{detail}</AppText>
      <AppText style={styles.addressText}>
        {street}, No: {buildNo}/{doorNumber}
      </AppText>
      <AppText style={styles.addressText}>
        {city}
        {postalCode ? ` / ${postalCode}` : ''}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#EFEFF2',
  },
  content: {
    padding: 14,
    paddingBottom: 30,
    gap: 10,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECECEF',
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    color: '#151518',
    fontWeight: '700',
    fontFamily: Fonts.rounded,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  rowLabel: {
    fontSize: 12,
    color: '#75757E',
    fontFamily: Fonts.sans,
  },
  rowValue: {
    flexShrink: 1,
    textAlign: 'right',
    fontSize: 12,
    color: '#1C1C20',
    fontFamily: Fonts.sans,
  },
  rowValueStrong: {
    fontSize: 13,
    color: '#111114',
    fontWeight: '700',
    fontFamily: Fonts.rounded,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F5',
  },
  itemImageWrap: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F6F6FA',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemMain: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontSize: 12,
    color: '#1C1C21',
    fontFamily: Fonts.sans,
    fontWeight: '600',
  },
  itemMeta: {
    fontSize: 10,
    color: '#8D8D96',
    fontFamily: Fonts.sans,
  },
  itemTotal: {
    fontSize: 12,
    color: '#16161A',
    fontWeight: '700',
    fontFamily: Fonts.rounded,
  },
  addressWrap: {
    gap: 3,
  },
  addressText: {
    color: '#4F4F58',
    fontSize: 12,
    fontFamily: Fonts.sans,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    color: '#6C6C74',
    fontSize: 13,
    textAlign: 'center',
    fontFamily: Fonts.sans,
  },
});

