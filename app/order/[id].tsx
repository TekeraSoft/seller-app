import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Stack, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Fonts } from '@/constants/theme';
import {
  acceptSellerOrder,
  createShipmentForSellerOrder,
  getInvoicePresignedUrl,
  getShippingSlipPresignedUrl,
  rejectSellerOrder,
  uploadSellerOrderInvoice,
} from '@/features/orders/api';
import { useAppSelector } from '@/store/hooks';

function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return fallback;
}

function toTurkishStatusLabel(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'Beklemede';
    case 'ACCEPTED':
      return 'Kabul Edildi';
    case 'REJECTED':
      return 'Reddedildi';
    case 'SHIPPED':
      return 'Kargoya Verildi';
    case 'DELIVERED':
      return 'Teslim Edildi';
    case 'CANCELLED':
      return 'İptal Edildi';
    case 'PROCESSING':
      return 'Hazırlanıyor';
    case 'RETURNED':
      return 'İade Edildi';
    default:
      return '';
  }
}

export default function OrderDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const orderId = typeof params.id === 'string' ? params.id : '';
  const order = useAppSelector((state) => state.orders.items.find((item) => item.id === orderId));

  const [trackingNumber, setTrackingNumber] = useState('');
  const [localOrderStatus, setLocalOrderStatus] = useState<string | null>(order?.sellerOrderStatus ?? null);
  const [isAcceptingOrder, setIsAcceptingOrder] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejectingOrder, setIsRejectingOrder] = useState(false);
  const [isSubmittingShipment, setIsSubmittingShipment] = useState(false);
  const [shipmentCreatedLocally, setShipmentCreatedLocally] = useState(false);
  const [isLoadingSlip, setIsLoadingSlip] = useState(false);
  const [isDownloadingSlip, setIsDownloadingSlip] = useState(false);
  const [isUploadingInvoice, setIsUploadingInvoice] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(false);
  const normalizedStatus = (localOrderStatus ?? order?.sellerOrderStatus ?? '').trim().toUpperCase();
  const canAcceptOrder = normalizedStatus === 'PENDING';
  const canCreateShipment = normalizedStatus === 'ACCEPTED' && !shipmentCreatedLocally;
  const isClosedForShipping = normalizedStatus === 'REJECTED' || normalizedStatus === 'CANCELLED';
  const canAccessShippingSlip =
    !isClosedForShipping &&
    (normalizedStatus === 'ACCEPTED' || normalizedStatus === 'SHIPPED' || shipmentCreatedLocally);
  const statusLabel =
    toTurkishStatusLabel(normalizedStatus) ||
    order?.displayStatus ||
    toTurkishStatusLabel((order?.sellerOrderStatus ?? '').trim().toUpperCase()) ||
    order?.sellerOrderStatus ||
    '-';

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

  const submitShipment = async () => {
    if (!order) return;
    if (!canCreateShipment) {
      Alert.alert('Islem engellendi', 'Bu islemler siparis kabul edildikten sonra kullanilabilir.');
      return;
    }
    const normalized = trackingNumber.trim();
    if (!normalized) {
      Alert.alert('Eksik bilgi', 'Lutfen takip numarasi girin.');
      return;
    }

    try {
      setIsSubmittingShipment(true);
      const response = await createShipmentForSellerOrder({
        sellerOrderId: order.id,
        trackingNumber: normalized,
      });
      setTrackingNumber(normalized);
      setShipmentCreatedLocally(true);
      Alert.alert('Basarili', response.message ?? 'Kargo bilgisi kaydedildi.');
    } catch (error) {
      Alert.alert('Hata', getErrorMessage(error, 'Kargo takip numarasi kaydedilemedi.'));
    } finally {
      setIsSubmittingShipment(false);
    }
  };

  const onCreateShipment = () => {
    Alert.alert(
      'Onay',
      'Bu takip numarasini kaydetmek istiyor musunuz?',
      [
        { text: 'Vazgec', style: 'cancel' },
        { text: 'Evet, Kaydet', onPress: () => void submitShipment() },
      ]
    );
  };

  const submitAcceptOrder = async () => {
    if (!order) return;
    if (!canAcceptOrder) return;
    try {
      setIsAcceptingOrder(true);
      const response = await acceptSellerOrder(order.id);
      setLocalOrderStatus('ACCEPTED');
      Alert.alert('Basarili', response.message ?? 'Siparis kabul edildi.');
    } catch (error) {
      Alert.alert('Hata', getErrorMessage(error, 'Siparis kabul edilemedi.'));
    } finally {
      setIsAcceptingOrder(false);
    }
  };

  const onAcceptOrder = () => {
    Alert.alert(
      'Siparis Kabul Onayi',
      'Bu siparisi kabul etmek istediginize emin misiniz?',
      [
        { text: 'Vazgec', style: 'cancel' },
        { text: 'Evet, Kabul Et', onPress: () => void submitAcceptOrder() },
      ]
    );
  };

  const submitRejectOrder = async () => {
    if (!order) return;
    if (!canAcceptOrder) return;
    const reason = rejectionReason.trim();
    if (reason.length < 3) {
      Alert.alert('Eksik bilgi', 'Lutfen en az 3 karakterlik red nedeni yazin.');
      return;
    }
    try {
      setIsRejectingOrder(true);
      const response = await rejectSellerOrder({
        sellerOrderId: order.id,
        rejectionReason: reason,
      });
      setLocalOrderStatus('REJECTED');
      Alert.alert('Basarili', response.message ?? 'Siparis reddedildi.');
    } catch (error) {
      Alert.alert('Hata', getErrorMessage(error, 'Siparis reddedilemedi.'));
    } finally {
      setIsRejectingOrder(false);
    }
  };

  const onRejectOrder = () => {
    Alert.alert(
      'Siparis Red Onayi',
      'Bu siparisi reddetmek istediginize emin misiniz?',
      [
        { text: 'Vazgec', style: 'cancel' },
        { text: 'Evet, Reddet', style: 'destructive', onPress: () => void submitRejectOrder() },
      ]
    );
  };

  const onOpenShippingSlip = async () => {
    if (!order) return;
    if (!canAccessShippingSlip) {
      Alert.alert('Islem engellendi', 'Kargo slibi sadece kabul edilen veya kargoya verilen sipariste acilabilir.');
      return;
    }
    try {
      setIsLoadingSlip(true);
      const url = await getShippingSlipPresignedUrl(order.orderNo);
      if (!url) {
        Alert.alert('Bilgi', 'Bu siparis icin kargo slibi bulunamadi.');
        return;
      }
      await WebBrowser.openBrowserAsync(url);
    } catch (error) {
      Alert.alert('Hata', getErrorMessage(error, 'Kargo slibi acilamadi.'));
    } finally {
      setIsLoadingSlip(false);
    }
  };

  const onDownloadShippingSlip = async () => {
    if (!order) return;
    if (!canAccessShippingSlip) {
      Alert.alert('Islem engellendi', 'Kargo slibi sadece kabul edilen veya kargoya verilen sipariste indirilebilir.');
      return;
    }
    try {
      setIsDownloadingSlip(true);
      const url = await getShippingSlipPresignedUrl(order.orderNo);
      if (!url) {
        Alert.alert('Bilgi', 'Bu siparis icin kargo slibi bulunamadi.');
        return;
      }

      const basePath = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
      if (!basePath) {
        Alert.alert('Hata', 'Dosya sistemi kullanilamiyor.');
        return;
      }
      const localUri = `${basePath}shipping-slip-${order.orderNo}.pdf`;
      const downloaded = await FileSystem.downloadAsync(url, localUri);

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(downloaded.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Kargo Slipi',
        });
      } else {
        await WebBrowser.openBrowserAsync(downloaded.uri);
      }
    } catch (error) {
      Alert.alert('Hata', getErrorMessage(error, 'Kargo slibi indirilemedi.'));
    } finally {
      setIsDownloadingSlip(false);
    }
  };

  const onUploadInvoice = async () => {
    if (!order) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf'],
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) {
        Alert.alert('Hata', 'Secilen dosya okunamadi.');
        return;
      }

      setIsUploadingInvoice(true);
      const response = await uploadSellerOrderInvoice({
        sellerOrderId: order.id,
        fileUri: asset.uri,
        fileName: asset.name ?? `invoice-${order.orderNo}.pdf`,
        mimeType: asset.mimeType,
      });
      Alert.alert('Basarili', response.message ?? 'Fatura yuklendi.');
      const nextInvoiceUrl = await getInvoicePresignedUrl(order.id);
      setInvoiceUrl(nextInvoiceUrl);
    } catch (error) {
      Alert.alert('Hata', getErrorMessage(error, 'Fatura yuklenemedi.'));
    } finally {
      setIsUploadingInvoice(false);
    }
  };

  const onOpenInvoice = async () => {
    if (!order) return;
    try {
      setIsLoadingInvoice(true);
      const url = invoiceUrl ?? (await getInvoicePresignedUrl(order.id));
      if (!url) {
        Alert.alert('Bilgi', 'Bu siparis icin yuklu fatura bulunamadi.');
        return;
      }
      setInvoiceUrl(url);
      await WebBrowser.openBrowserAsync(url);
    } catch (error) {
      Alert.alert('Hata', getErrorMessage(error, 'Fatura acilamadi.'));
    } finally {
      setIsLoadingInvoice(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <Stack.Screen options={{ title: order ? `#${order.orderNo}` : 'Siparis Detayi' }} />
      {!order ? (
        <View style={styles.emptyWrap}>
          <AppText style={styles.emptyText}>Siparis detayi bulunamadi. Listeyi yenileyip tekrar dene.</AppText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.infoCard}>
            <AppText style={styles.sectionTitle} tone="rounded">
              Siparis Bilgisi
            </AppText>
            {canAcceptOrder ? (
              <View style={styles.pendingActionsWrap}>
                <Pressable
                  style={[styles.acceptButton, isAcceptingOrder && styles.buttonDisabled]}
                  onPress={onAcceptOrder}
                  disabled={isAcceptingOrder || isRejectingOrder}>
                  {isAcceptingOrder ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <AppText style={styles.acceptButtonText}>Siparisi Kabul Et</AppText>
                  )}
                </Pressable>
                <TextInput
                  value={rejectionReason}
                  onChangeText={setRejectionReason}
                  placeholder="Red nedeni yazin"
                  placeholderTextColor="#A1A1AA"
                  style={styles.rejectInput}
                  editable={!isAcceptingOrder && !isRejectingOrder}
                />
                <Pressable
                  style={[styles.rejectButton, isRejectingOrder && styles.buttonDisabled]}
                  onPress={onRejectOrder}
                  disabled={isRejectingOrder || isAcceptingOrder}>
                  {isRejectingOrder ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <AppText style={styles.rejectButtonText}>Siparisi Reddet</AppText>
                  )}
                </Pressable>
              </View>
            ) : null}
            <Row label="Siparis No" value={`#${order.orderNo}`} />
            <Row label="Alici" value={order.buyerName} />
            <Row label="Telefon" value={order.buyerPhone} />
            <Row label="Tarih" value={formatDate(order.createdAt)} />
            <Row label="Durum" value={statusLabel} />
            <Row label="Odeme" value={order.paymentStatus ?? '-'} />
          </View>

          <View style={styles.infoCard}>
            <AppText style={styles.sectionTitle} tone="rounded">
              Kargo ve Fatura Islemleri
            </AppText>
            {!canAccessShippingSlip ? (
              <AppText style={styles.hintText}>
                Kargo slipi sadece "Kabul Edildi" veya "Kargoya Verildi" durumunda kullanılabilir.
              </AppText>
            ) : null}
            {shipmentCreatedLocally ? (
              <AppText style={styles.hintText}>
                Takip numarasi kaydedildi. Tekrar giris kapatildi.
              </AppText>
            ) : null}

            {canCreateShipment ? (
              <View style={styles.actionsRow}>
                <TextInput
                  value={trackingNumber}
                  onChangeText={setTrackingNumber}
                  placeholder="Kargo takip numarasi"
                  placeholderTextColor="#A1A1AA"
                  autoCapitalize="characters"
                  style={styles.input}
                  editable={canCreateShipment}
                />
                <Pressable
                  style={[styles.primaryButton, !canCreateShipment && styles.buttonDisabled]}
                  onPress={onCreateShipment}
                  disabled={isSubmittingShipment || !canCreateShipment}>
                  {isSubmittingShipment ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <AppText style={styles.primaryButtonText}>Takip No Kaydet</AppText>
                  )}
                </Pressable>
              </View>
            ) : null}

            <View style={styles.actionsRow}>
              {canAccessShippingSlip ? (
                <Pressable
                  style={[styles.secondaryButton, !canAccessShippingSlip && styles.buttonDisabled]}
                  onPress={onOpenShippingSlip}
                  disabled={isLoadingSlip || !canAccessShippingSlip}>
                  {isLoadingSlip ? <ActivityIndicator color="#1C1C20" /> : <AppText style={styles.secondaryButtonText}>Kargo Slipi Ac</AppText>}
                </Pressable>
              ) : null}
              {canAccessShippingSlip ? (
                <Pressable
                  style={[styles.secondaryButton, !canAccessShippingSlip && styles.buttonDisabled]}
                  onPress={onDownloadShippingSlip}
                  disabled={isDownloadingSlip || !canAccessShippingSlip}>
                  {isDownloadingSlip ? <ActivityIndicator color="#1C1C20" /> : <AppText style={styles.secondaryButtonText}>Kargo Slipi Indir</AppText>}
                </Pressable>
              ) : null}
              <Pressable
                style={styles.secondaryButton}
                onPress={onUploadInvoice}
                disabled={isUploadingInvoice}>
                {isUploadingInvoice ? <ActivityIndicator color="#1C1C20" /> : <AppText style={styles.secondaryButtonText}>Fatura Yukle</AppText>}
              </Pressable>
              <Pressable
                style={styles.secondaryButton}
                onPress={onOpenInvoice}
                disabled={isLoadingInvoice}>
                {isLoadingInvoice ? <ActivityIndicator color="#1C1C20" /> : <AppText style={styles.secondaryButtonText}>Fatura Ac</AppText>}
              </Pressable>
            </View>
          </View>

          <View style={styles.infoCard}>
            <AppText style={styles.sectionTitle} tone="rounded">
              Urunler
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
            <Row label="Urun Toplami" value={formatCurrency(order.totalPrice)} />
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
  pendingActionsWrap: {
    gap: 8,
  },
  acceptButton: {
    backgroundColor: '#0F9D58',
    borderRadius: 10,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  acceptButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontFamily: Fonts.rounded,
    fontWeight: '700',
  },
  rejectInput: {
    borderWidth: 1,
    borderColor: '#E8B4B4',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#151518',
    fontFamily: Fonts.sans,
    fontSize: 13,
    backgroundColor: '#FFF',
  },
  rejectButton: {
    backgroundColor: '#C62828',
    borderRadius: 10,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  rejectButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontFamily: Fonts.rounded,
    fontWeight: '700',
  },
  hintText: {
    color: '#8A8A94',
    fontSize: 12,
    fontFamily: Fonts.sans,
  },
  actionsRow: {
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D9D9E0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#151518',
    fontFamily: Fonts.sans,
    fontSize: 13,
    backgroundColor: '#FFF',
  },
  primaryButton: {
    backgroundColor: '#18181C',
    borderRadius: 10,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontFamily: Fonts.rounded,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#F6F6FA',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E2EA',
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  secondaryButtonText: {
    color: '#1C1C20',
    fontSize: 13,
    fontFamily: Fonts.rounded,
    fontWeight: '700',
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
