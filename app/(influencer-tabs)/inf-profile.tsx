import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { useAuth } from '@/context/auth-context';
import {
  getActiveContract,
  getMyApplication,
  PlatformContractDto,
  updateInfluencerBankInfo
} from '@/features/influencer/api';
import { InfluencerApplication } from '@/features/influencer/types';
import {
  addMessageToTicketing,
  createInfluencerTicket,
  fetchInfluencerTickets,
  fetchTicketById,
} from '@/features/ticketing/api';
import { TicketingItem } from '@/features/ticketing/types';

const P = '#8D73FF';

const CONTRACT_TEXT = `INFLUENCER İŞ BİRLİĞİ SÖZLEŞMESİ

Son Güncelleme: Ocak 2026

Bu sözleşme; Tekera Teknoloji Ticaret ve Sanayi Limited Şirketi ("Tekera21") ile influencer başvurusunu tamamlayan kişi ("Etkileşimci / Influencer") arasında akdedilmiştir.

MADDE 1 — TANIMLAR

1.1. "Platform": Tekera21'in işlettiği tekera21.com alan adlı e-ticaret ve içerik platformu ile mobil uygulamalarını ifade eder.

1.2. "İçerik": Influencer tarafından oluşturulan fotoğraf, video, hikâye, reels, gönderi ve benzeri dijital materyalleri ifade eder.

1.3. "Kampanya": Tekera21 tarafından belirlenen ürün, hizmet veya marka tanıtım faaliyetlerini ifade eder.

MADDE 2 — SÖZLEŞMENİN KONUSU

İşbu sözleşme; Influencer'ın Tekera21 platformunda yer alan ürün ve hizmetleri sosyal medya kanallarında tanıtması, Tekera21'in ise Influencer'a belirlenen komisyon/ücret ödemesini yapması esasına dayanmaktadır.

MADDE 3 — TARAFLARIN YÜKÜMLÜLÜKLERİ

3.1. Influencer'ın Yükümlülükleri:

a) Paylaşılan içeriklerin doğru, yanıltıcı olmayan ve Türk Ticaret Kanunu ile Reklam Kanunu'na uygun olmasını sağlamak.

b) Ticari iş birliği olan paylaşımları "#reklam", "#işbirliği" veya "#sponsored" gibi açıklayıcı etiketlerle belirtmek.

c) Tekera21'in marka kimliğine zarar verecek, rakip platformları öne çıkaracak veya yanıltıcı bilgi içerecek içerik üretmemek.

d) Başvuruda beyan edilen kişisel ve finansal bilgilerin doğruluğunu korumak; değişiklik durumunda Tekera21'i derhal bilgilendirmek.

e) Tekera21'in önceden yazılı onayı olmaksızın platform aracılığıyla elde edilen gizli ticari bilgileri üçüncü kişilerle paylaşmamak.

3.2. Tekera21'in Yükümlülükleri:

a) Kampanya detaylarını Influencer'a önceden bildirmek.

b) Belirlenen komisyon veya ücret ödemelerini zamanında ve eksiksiz yapmak.

c) Influencer'ın kişisel verilerini KVKK kapsamında korumak.

MADDE 4 — ÖDEME KOŞULLARI

4.1. Ödemeler; Influencer tarafından sisteme kayıtlı IBAN numarasına, her ayın son iş günü yapılır.

4.2. Minimum ödeme eşiği 500 TL olup bu tutarın altındaki bakiyeler bir sonraki ödeme dönemine devredilir.

4.3. Vergi yükümlülükleri tamamen Influencer'a aittir. Tekera21, yasal zorunluluklar çerçevesinde stopaj kesintisi uygulayabilir.

4.4. Yanlış veya eksik banka bilgisinden kaynaklanacak ödeme gecikmeleri Tekera21'in sorumluluğunda değildir.

MADDE 5 — FİKRİ MÜLKİYET

5.1. Influencer, Tekera21 için ürettiği içeriklerin kullanım hakkını Tekera21'e devreder.

5.2. Influencer, ürettiği içeriklerde üçüncü kişilerin fikri mülkiyet haklarını ihlal etmeyeceğini taahhüt eder.

MADDE 6 — GİZLİLİK

6.1. Taraflar, işbu sözleşme kapsamında öğrendikleri ticari sırları ve gizli bilgileri sözleşmenin sona ermesinden itibaren 2 yıl süreyle gizli tutmakla yükümlüdür.

MADDE 7 — SÖZLEŞMENİN FESHİ

7.1. Her iki taraf da 15 gün önceden yazılı bildirimde bulunmak kaydıyla sözleşmeyi sonlandırabilir.

7.2. Influencer'ın aşağıdaki hallerde sözleşmesi derhal feshedilebilir:
- Yanıltıcı içerik yayımlaması
- Marka değerine zarar verecek paylaşım yapması
- Başvuruda gerçeğe aykırı bilgi verdiğinin tespiti

7.3. Fesih durumunda Influencer'a ait birikmiş ödemeler varsa hesaplanarak tasfiye edilir.

MADDE 8 — KİŞİSEL VERİLER

8.1. Influencer'ın kişisel verileri, 6698 sayılı KVKK kapsamında işlenir.

8.2. Veriler; sözleşme yükümlülüklerinin yerine getirilmesi, ödeme işlemleri ve yasal yükümlülüklerin karşılanması amacıyla kullanılır.

8.3. Influencer, kişisel verileri üzerindeki hakları için kvkk@tekera21.com adresine başvurabilir.

MADDE 9 — UYGULANACAK HUKUK VE YETKİLİ MAHKEME

9.1. İşbu sözleşme Türk Hukuku'na tabidir.

9.2. Sözleşmeden doğacak uyuşmazlıklarda İstanbul Mahkemeleri ve İcra Daireleri yetkilidir.

MADDE 10 — YÜRÜRLÜK

İşbu sözleşme, Influencer'ın dijital onay vermesiyle yürürlüğe girer ve her iki tarafça bağlayıcı kabul edilir.

Tekera Teknoloji Ticaret ve Sanayi Limited Şirketi
tekera21.com | destek@tekera21.com`;

type Section = 'menu' | 'personal' | 'bank' | 'contract' | 'tickets' | 'newTicket' | 'ticketDetail';

export default function InfProfileScreen() {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const router = useRouter();

  const [section, setSection] = useState<Section>('menu');
  const [app, setApp] = useState<InfluencerApplication | null>(null);
  const [loading, setLoading] = useState(false);

  // Banka
  const [iban, setIban] = useState('');
  const [holderName, setHolderName] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankSaving, setBankSaving] = useState(false);

  // Sözleşme
  const [contract, setContract] = useState<PlatformContractDto | null>(null);
  const [contractLoading, setContractLoading] = useState(false);

  // Ticket
  const [tickets, setTickets] = useState<TicketingItem[]>([]);
  const [ticketMsg, setTicketMsg] = useState('');
  const [ticketSending, setTicketSending] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketingItem | null>(null);
  const [replyMsg, setReplyMsg] = useState('');
  const [replySending, setReplySending] = useState(false);

  const loadApp = useCallback(async () => {
    try {
      const data = await getMyApplication();
      setApp(data);
      setIban(data.iban ?? '');
      setHolderName(data.accountHolderName ?? '');
      setBankName(data.bankName ?? '');
    } catch {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadApp();
    }, [loadApp])
  );

  const handleLogout = () => {
    Alert.alert('Çıkış Yap', 'Hesabınızdan çıkmak istediğinize emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Çıkış Yap',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/auth');
        },
      },
    ]);
  };

  const handleSaveBank = async () => {
    if (!iban.trim() || !holderName.trim() || !bankName.trim()) {
      Alert.alert('Hata', 'Tüm alanları doldurun');
      return;
    }
    setBankSaving(true);
    try {
      await updateInfluencerBankInfo({ iban: iban.trim(), accountHolderName: holderName.trim(), bankName: bankName.trim() });
      Alert.alert('Başarılı', 'Banka bilgileri güncellendi');
      loadApp();
    } catch {
      Alert.alert('Hata', 'Banka bilgileri güncellenemedi');
    } finally {
      setBankSaving(false);
    }
  };

  const loadTickets = async () => {
    setLoading(true);
    try {
      const res = await fetchInfluencerTickets({ page: 0, size: 50 });
      setTickets(res.content);
    } catch {}
    setLoading(false);
  };

  const handleSendTicket = async () => {
    if (!ticketMsg.trim()) return;
    setTicketSending(true);
    try {
      await createInfluencerTicket(ticketMsg.trim());
      setTicketMsg('');
      Alert.alert('Gönderildi', 'Destek talebiniz oluşturuldu');
      loadTickets();
      setSection('tickets');
    } catch {
      Alert.alert('Hata', 'Destek talebi gönderilemedi');
    } finally {
      setTicketSending(false);
    }
  };

  const handleReply = async () => {
    if (!replyMsg.trim() || !selectedTicket) return;
    setReplySending(true);
    try {
      const updated = await addMessageToTicketing({ ticketingId: selectedTicket.id, content: replyMsg.trim() });
      setSelectedTicket(updated);
      setReplyMsg('');
    } catch {
      Alert.alert('Hata', 'Mesaj gönderilemedi');
    } finally {
      setReplySending(false);
    }
  };

  const openTicket = async (ticket: TicketingItem) => {
    setSelectedTicket(ticket);
    setSection('ticketDetail');
    try {
      const fresh = await fetchTicketById(ticket.id);
      setSelectedTicket(fresh);
    } catch {}
  };

  // ─── Ana Menü ─────────────────────────────────────────────────────
  if (section === 'menu') {
    return (
      <ScrollView
        style={s.container}
        contentContainerStyle={[s.content, { paddingBottom: 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profil Kartı */}
        <View style={s.profileCard}>
          <View style={s.avatarWrap}>
            <Ionicons name="person" size={28} color={P} />
          </View>
          <View style={s.profileInfo}>
            {app && (
              <AppText style={s.profileName}>{app.name} {app.surname}</AppText>
            )}
            <View style={s.statusBadge}>
              <View style={s.statusDot} />
              <AppText style={s.statusText}>Aktif</AppText>
            </View>
          </View>
        </View>

        <AppText style={s.sectionTitle}>Hesap</AppText>
        <View style={s.menuGroup}>
          <MenuItem icon="person-outline" label="Kişisel Bilgiler" subtitle="Ad, soyad, telefon, sosyal medya" color={P} onPress={() => setSection('personal')} />
          <MenuItem icon="card-outline" label="Banka Bilgileri" subtitle="IBAN ve hesap bilgileri" color="#45B7D1" onPress={() => setSection('bank')} />
          <MenuItem icon="document-text-outline" label="Sözleşme" subtitle="Influencer sözleşmesi" color="#4ECDC4" onPress={() => {
            setContractLoading(true);
            getActiveContract('INFLUENCER').then(setContract).catch(() => {}).finally(() => setContractLoading(false));
            setSection('contract');
          }} />
        </View>

        <AppText style={s.sectionTitle}>Destek</AppText>
        <View style={s.menuGroup}>
          <MenuItem icon="chatbubble-outline" label="Destek Taleplerim" subtitle="Açık ve geçmiş talepler" color="#FF9F43" onPress={() => { loadTickets(); setSection('tickets'); }} />
          <MenuItem icon="add-circle-outline" label="Yeni Destek Talebi" subtitle="Sorun veya soru bildirin" color={P} onPress={() => setSection('newTicket')} />
        </View>

        <View style={[s.menuGroup, { marginTop: 8 }]}>
          <MenuItem icon="log-out-outline" label="Çıkış Yap" danger onPress={handleLogout} />
        </View>
      </ScrollView>
    );
  }

  // ─── Alt Sayfalar ─────────────────────────────────────────────────
  const renderBack = (title: string) => (
    <View style={s.subHeader}>
      <Pressable onPress={() => setSection('menu')} style={s.backBtn}>
        <Ionicons name="arrow-back" size={20} color="#1C1631" />
      </Pressable>
      <AppText style={s.subTitle}>{title}</AppText>
    </View>
  );

  // ─── Kişisel Bilgiler ─────────────────────────────────────────────
  if (section === 'personal') {
    return (
      <ScrollView style={s.container} contentContainerStyle={[s.content, { paddingBottom: 100 + insets.bottom }]}>
        {renderBack('Kişisel Bilgiler')}
        {app ? (
          <View style={s.detailCard}>
            <DetailRow label="Ad" value={app.name} />
            <DetailRow label="Soyad" value={app.surname} />
            <DetailRow label="E-posta" value={app.userEmail} />
            <DetailRow label="Telefon" value={app.gsmNumber} />
            <DetailRow label="Şirket Tipi" value={app.companyType === 'BIREYSEL' ? 'Şahıs' : 'Limited Şirket'} />
            {app.nationalId && <DetailRow label="TC Kimlik No" value={app.nationalId} />}
            {app.taxNumber && <DetailRow label="Vergi No" value={app.taxNumber} />}
            {Object.entries(app.socialLinks ?? {}).map(([platform, url]) => (
              <DetailRow key={platform} label={platform} value={url} />
            ))}
          </View>
        ) : (
          <ActivityIndicator color={P} style={{ marginTop: 32 }} />
        )}
      </ScrollView>
    );
  }

  // ─── Banka Bilgileri ──────────────────────────────────────────────
  if (section === 'bank') {
    return (
      <ScrollView style={s.container} contentContainerStyle={[s.content, { paddingBottom: 100 + insets.bottom }]}>
        {renderBack('Banka Bilgileri')}
        <View style={s.detailCard}>
          <AppText style={s.inputLabel}>IBAN</AppText>
          <TextInput style={s.input} value={iban} onChangeText={setIban} placeholder="TR00 0000 0000 0000 0000 0000 00" placeholderTextColor="#C8C4E0" />

          <AppText style={s.inputLabel}>Hesap Sahibi</AppText>
          <TextInput style={s.input} value={holderName} onChangeText={setHolderName} placeholder="Ad Soyad" placeholderTextColor="#C8C4E0" />

          <AppText style={s.inputLabel}>Banka Adı</AppText>
          <TextInput style={s.input} value={bankName} onChangeText={setBankName} placeholder="Banka adını girin" placeholderTextColor="#C8C4E0" />

          <Pressable
            style={[s.saveBtn, bankSaving && { opacity: 0.6 }]}
            onPress={handleSaveBank}
            disabled={bankSaving}
          >
            {bankSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <AppText style={s.saveBtnText}>Kaydet</AppText>
            )}
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // ─── Sözleşme ─────────────────────────────────────────────────────
  if (section === 'contract') {
    return (
      <ScrollView style={s.container} contentContainerStyle={[s.content, { paddingBottom: 100 + insets.bottom }]}>
        {renderBack('Sözleşme')}
        <View style={s.contractBadge}>
          <Ionicons name="checkmark-circle" size={16} color="#4ECDC4" />
          <AppText style={s.contractBadgeText}>Sözleşme Onaylandı</AppText>
          {contract?.publishedAt && (
            <AppText style={s.contractDate}>
              v{contract.version} · {new Date(contract.publishedAt).toLocaleDateString('tr-TR')}
            </AppText>
          )}
        </View>
        {contractLoading ? (
          <ActivityIndicator color={P} style={{ marginTop: 32 }} />
        ) : contract ? (
          <View style={s.detailCard}>
            <AppText style={s.contractBody}>{contract.content}</AppText>
          </View>
        ) : (
          <View style={s.detailCard}>
            <AppText style={s.contractBody}>{CONTRACT_TEXT}</AppText>
          </View>
        )}
      </ScrollView>
    );
  }

  // ─── Destek Taleplerim ────────────────────────────────────────────
  if (section === 'tickets') {
    return (
      <ScrollView style={s.container} contentContainerStyle={[s.content, { paddingBottom: 100 + insets.bottom }]}>
        {renderBack('Destek Taleplerim')}
        {loading ? (
          <ActivityIndicator color={P} style={{ marginTop: 32 }} />
        ) : tickets.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="chatbubbles-outline" size={40} color="#C8C4E0" />
            <AppText style={s.emptyTitle}>Henüz destek talebiniz yok</AppText>
          </View>
        ) : (
          tickets.map((t) => (
            <Pressable
              key={t.id}
              style={s.ticketCard}
              onPress={() => void openTicket(t)}
            >
              <View style={s.ticketHeader}>
                <View style={[s.ticketStatus, { backgroundColor: t.isOpen ? 'rgba(78,205,196,0.1)' : 'rgba(154,150,181,0.1)' }]}>
                  <AppText style={[s.ticketStatusText, { color: t.isOpen ? '#4ECDC4' : '#9A96B5' }]}>
                    {t.isOpen ? 'Açık' : 'Kapalı'}
                  </AppText>
                </View>
                <AppText style={s.ticketDate}>{t.createdAt}</AppText>
              </View>
              <AppText style={s.ticketMsg} numberOfLines={2}>
                {t.messages[t.messages.length - 1]?.content ?? ''}
              </AppText>
            </Pressable>
          ))
        )}
      </ScrollView>
    );
  }

  // ─── Yeni Destek Talebi ───────────────────────────────────────────
  if (section === 'newTicket') {
    return (
      <ScrollView style={s.container} contentContainerStyle={[s.content, { paddingBottom: 100 + insets.bottom }]}>
        {renderBack('Yeni Destek Talebi')}
        <View style={s.detailCard}>
          <AppText style={s.inputLabel}>Mesajınız</AppText>
          <TextInput
            style={[s.input, { height: 120, textAlignVertical: 'top' }]}
            value={ticketMsg}
            onChangeText={setTicketMsg}
            placeholder="Sorununuzu veya sorunuzu detaylı açıklayın..."
            placeholderTextColor="#C8C4E0"
            multiline
          />
          <Pressable
            style={[s.saveBtn, ticketSending && { opacity: 0.6 }]}
            onPress={handleSendTicket}
            disabled={ticketSending}
          >
            {ticketSending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={16} color="#fff" />
                <AppText style={s.saveBtnText}>Gönder</AppText>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // ─── Ticket Detay ─────────────────────────────────────────────────
  if (section === 'ticketDetail' && selectedTicket) {
    return (
      <ScrollView style={s.container} contentContainerStyle={[s.content, { paddingBottom: 100 + insets.bottom }]}>
        {renderBack('Destek Talebi')}
        <View style={[s.ticketStatus, { marginBottom: 12, alignSelf: 'flex-start', backgroundColor: selectedTicket.isOpen ? 'rgba(78,205,196,0.1)' : 'rgba(154,150,181,0.1)' }]}>
          <AppText style={[s.ticketStatusText, { color: selectedTicket.isOpen ? '#4ECDC4' : '#9A96B5' }]}>
            {selectedTicket.isOpen ? 'Açık' : 'Kapalı'}
          </AppText>
        </View>
        {selectedTicket.messages.map((msg, i) => {
          const isSupport = msg.title !== selectedTicket.sellerTitle && msg.title !== 'Customer';
          return (
            <View key={i} style={[s.msgBubble, isSupport ? s.msgBubbleSupport : s.msgBubbleUser]}>
              <AppText style={s.msgSender}>{msg.userNameSurname}</AppText>
              <AppText style={s.msgContent}>{msg.content}</AppText>
              {msg.createdAt ? <AppText style={s.msgTime}>{msg.createdAt}</AppText> : null}
            </View>
          );
        })}
        {selectedTicket.isOpen && (
          <View style={[s.detailCard, { marginTop: 8 }]}>
            <AppText style={s.inputLabel}>Yanıt Yaz</AppText>
            <TextInput
              style={[s.input, { height: 100, textAlignVertical: 'top' }]}
              value={replyMsg}
              onChangeText={setReplyMsg}
              placeholder="Mesajınızı yazın..."
              placeholderTextColor="#C8C4E0"
              multiline
            />
            <Pressable
              style={[s.saveBtn, replySending && { opacity: 0.6 }]}
              onPress={() => void handleReply()}
              disabled={replySending}
            >
              {replySending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="send" size={16} color="#fff" />
                  <AppText style={s.saveBtnText}>Gönder</AppText>
                </>
              )}
            </Pressable>
          </View>
        )}
      </ScrollView>
    );
  }

  return null;
}

// ─── Alt Bileşenler ─────────────────────────────────────────────────

function MenuItem({ icon, label, subtitle, color = '#3D3660', onPress, danger }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; subtitle?: string; color?: string; onPress?: () => void; danger?: boolean;
}) {
  return (
    <Pressable style={({ pressed }) => [s.menuItem, pressed && { opacity: 0.7 }]} onPress={onPress}>
      <View style={[s.menuIcon, { backgroundColor: (danger ? '#FF6B6B' : color) + '14' }]}>
        <Ionicons name={icon} size={20} color={danger ? '#FF6B6B' : color} />
      </View>
      <View style={s.menuContent}>
        <AppText style={[s.menuLabel, danger && { color: '#FF6B6B' }]}>{label}</AppText>
        {subtitle ? <AppText style={s.menuSubtitle}>{subtitle}</AppText> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color="#C8C4E0" />
    </Pressable>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <View style={s.detailRow}>
      <AppText style={s.detailLabel}>{label}</AppText>
      <AppText style={s.detailValue}>{value}</AppText>
    </View>
  );
}

// ─── Stiller ────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F6FB' },
  content: { padding: 16 },

  // Profil kartı
  profileCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, flexDirection: 'row',
    alignItems: 'center', gap: 16, marginBottom: 24, borderWidth: 1, borderColor: '#F0EEFF',
  },
  avatarWrap: {
    width: 60, height: 60, borderRadius: 18, backgroundColor: 'rgba(141,115,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  profileInfo: { flex: 1, gap: 6 },
  profileName: { fontSize: 16, fontWeight: '700', color: '#1C1631' },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    gap: 6, backgroundColor: 'rgba(78,205,196,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ECDC4' },
  statusText: { fontSize: 12, fontWeight: '600', color: '#2BA89D' },

  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: '#9A96B5', textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: 10, marginLeft: 4,
  },

  // Menü
  menuGroup: {
    backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden',
    marginBottom: 20, borderWidth: 1, borderColor: '#F0EEFF',
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12,
    borderBottomWidth: 1, borderBottomColor: '#F7F6FB',
  },
  menuIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuContent: { flex: 1 },
  menuLabel: { fontSize: 14, fontWeight: '600', color: '#1C1631' },
  menuSubtitle: { fontSize: 11, color: '#9A96B5', marginTop: 1 },

  // Alt sayfa header
  subHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F0EEFF', alignItems: 'center', justifyContent: 'center' },
  subTitle: { fontSize: 18, fontWeight: '700', color: '#1C1631' },

  // Detay kartı
  detailCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: '#F0EEFF',
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F7F6FB',
  },
  detailLabel: { fontSize: 13, color: '#9A96B5', flex: 1 },
  detailValue: { fontSize: 13, fontWeight: '600', color: '#1C1631', flex: 1.5, textAlign: 'right' },

  // Input
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#3D3660', marginBottom: 6, marginTop: 12 },
  input: {
    height: 44, borderWidth: 1, borderColor: '#F0EEFF', borderRadius: 12,
    paddingHorizontal: 14, fontSize: 14, color: '#1C1631', backgroundColor: '#FAFAFE',
  },
  saveBtn: {
    height: 44, borderRadius: 12, backgroundColor: P, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20,
  },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Sözleşme
  contractBadge: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6, backgroundColor: 'rgba(78,205,196,0.1)', paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 12, marginBottom: 12,
  },
  contractBadgeText: { fontSize: 13, fontWeight: '600', color: '#2BA89D', flex: 1 },
  contractDate: { fontSize: 11, color: '#9A96B5' },
  contractBody: { fontSize: 13, color: '#3D3660', lineHeight: 21 },

  // Ticket
  ticketCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#F0EEFF',
  },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  ticketStatus: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  ticketStatusText: { fontSize: 11, fontWeight: '700' },
  ticketDate: { fontSize: 11, color: '#9A96B5' },
  ticketMsg: { fontSize: 13, color: '#3D3660', lineHeight: 18 },

  // Boş durum
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyTitle: { fontSize: 14, color: '#9A96B5' },

  // Mesaj baloncukları
  msgBubble: { borderRadius: 12, padding: 12, marginBottom: 8, maxWidth: '90%' },
  msgBubbleUser: { backgroundColor: '#F0EEFF', alignSelf: 'flex-end' },
  msgBubbleSupport: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F0EEFF', alignSelf: 'flex-start' },
  msgSender: { fontSize: 11, fontWeight: '700', color: '#8D73FF', marginBottom: 4 },
  msgContent: { fontSize: 13, color: '#3D3660', lineHeight: 19 },
  msgTime: { fontSize: 10, color: '#9A96B5', marginTop: 4, textAlign: 'right' },

});
