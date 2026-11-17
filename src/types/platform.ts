export type Language = 'bn' | 'en';

export type UserRole =
  | 'guest'
  | 'registered'
  | 'mother_parent'
  | 'creator'
  | 'doctor'
  | 'seller'
  | 'content_editor'
  | 'moderator'
  | 'admin'
  | 'super_admin';

export type PostType =
  | 'photo'
  | 'carousel'
  | 'short_video'
  | 'long_video'
  | 'text'
  | 'question'
  | 'poll'
  | 'review';

export type FeedTab = 'discover' | 'following' | 'videos' | 'trending';

export type AgeGroupKey =
  | 'newborn'
  | 'infant'
  | 'toddler'
  | 'preschool'
  | 'kids'
  | 'pregnancy'
  | 'new_mother';

export type ProductCollectionTag =
  | 'best_seller'
  | 'new_arrival'
  | 'trending'
  | 'recommended';

export interface UserProfile {
  uid: string;
  displayName: string;
  username: string;
  bio: string;
  avatarUrl: string;
  coverUrl?: string;
  roles: UserRole[];
  creatorCategory?: string;
  isPrivate: boolean;
  followersCount: number;
  followingCount: number;
  likesCount: number;
  location?: string;
}

export interface PostItem {
  id: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string;
  authorBadge?: string;
  type: PostType;
  category: string;
  titleEn: string;
  titleBn: string;
  captionEn: string;
  captionBn: string;
  mediaUrls: string[];
  aspectRatio: '3:4' | '4:3' | '1:1' | '9:16' | '16:9';
  isVideo: boolean;
  videoDurationSec?: number;
  videoStatus?: 'processing' | 'ready' | 'failed' | 'rejected' | 'deleted';
  videoDemoMode?: boolean;
  hashtags: string[];
  taggedProductIds: string[];
  location?: string;
  isSponsored: boolean;
  language: Language | 'both';
  moderationStatus: 'approved' | 'pending' | 'removed';
  likesCount: number;
  commentsCount: number;
  savesCount: number;
  viewsCount: number;
  createdAt: string;
}

export interface CommentItem {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  parentCommentId?: string;
  likesCount: number;
  createdAt: string;
}

export interface QuestionAnswer {
  id: string;
  questionId: string;
  authorId: string;
  authorName: string;
  isDoctorVerified: boolean;
  body: string;
  parentAnswerId?: string;
  likesCount: number;
  createdAt: string;
}

export interface QuestionItem {
  id: string;
  authorId: string;
  authorDisplayName: string;
  isAnonymous: boolean;
  category: string;
  titleEn: string;
  titleBn: string;
  bodyEn: string;
  bodyBn: string;
  imageUrl?: string;
  bestAnswerId?: string;
  likesCount: number;
  answersCount: number;
  moderationStatus: 'approved' | 'pending' | 'removed';
  answers: QuestionAnswer[];
  createdAt: string;
}

export interface PollItem {
  id: string;
  authorId: string;
  authorName: string;
  category: string;
  questionEn: string;
  questionBn: string;
  options: { id: string; labelEn: string; labelBn: string; votes: number }[];
  totalVotes: number;
  createdAt: string;
}

export interface DoctorProfile {
  id: string;
  userId: string;
  nameEn: string;
  nameBn: string;
  specialisation: string;
  qualifications: string;
  bmdcRegNote: string;
  experienceYears: number;
  hospitalEn: string;
  hospitalBn: string;
  consultationFeeBdt: number;
  languages: string[];
  avatarUrl: string;
  isVerified: boolean;
  availableSlots: string[];
  rating: number;
  reviewsCount: number;
}

export interface AppointmentItem {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string;
  slot: string;
  consultationType: 'video' | 'clinic';
  feeBdt: number;
  paymentMethod: 'bkash_sandbox' | 'nagad_sandbox' | 'card_sandbox';
  paymentStatus: 'pending' | 'paid_sandbox' | 'refunded';
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: string;
}

export interface GuideArticle {
  id: string;
  slug: string;
  category: 'pregnancy' | 'mother_care' | 'baby_care' | 'child_development';
  topicKey?: string;
  ageGroups?: AgeGroupKey[];
  titleEn: string;
  titleBn: string;
  summaryEn: string;
  summaryBn: string;
  bodyEn: string;
  bodyBn: string;
  authorName: string;
  medicalReviewerName?: string;
  isMedicallyReviewed: boolean;
  references: string[];
  imageUrl: string;
  readTimeMin: number;
  publishedAt: string;
  updatedAt: string;
}

export interface GrowthLog {
  id: string;
  babyId: string;
  recordedDate: string;
  ageMonths: number;
  weightKg: number;
  heightCm: number;
  sleepHours: number;
  feedingNotes: string;
}

export interface VaccinationRecord {
  id: string;
  vaccineNameEn: string;
  vaccineNameBn: string;
  dueAgeMonths: number;
  status: 'pending' | 'completed';
  completedDate?: string;
}

export interface BabyReminder {
  id: string;
  title: string;
  category: 'vaccine' | 'feeding' | 'checkup' | 'sleep';
  dueDate: string;
  dueTime?: string;
  isCompleted: boolean;
  createdAt: string;
}

export interface BabyProfile {
  id: string;
  parentId: string;
  name: string;
  dob: string;
  gender: 'girl' | 'boy' | 'unspecified';
  logs: GrowthLog[];
  vaccinations: VaccinationRecord[];
  milestonesCompleted: string[];
  reminders?: BabyReminder[];
}

export interface ProductQuestion {
  id: string;
  authorName: string;
  question: string;
  answer?: string;
  answeredBy?: string;
  createdAt: string;
}

export interface ProductItem {
  id: string;
  sellerId: string;
  shopSlug: string;
  shopName: string;
  brandId?: string;
  brandName?: string;
  category: string;
  subCategory?: string;
  ageGroups?: AgeGroupKey[];
  collectionTags?: ProductCollectionTag[];
  titleEn: string;
  titleBn: string;
  descriptionEn: string;
  descriptionBn: string;
  priceBdt: number;
  compareAtBdt?: number;
  stock: number;
  variants: string[];
  imageUrl: string;
  galleryUrls?: string[];
  specifications?: Record<string, string>;
  safetyInfoEn?: string;
  safetyInfoBn?: string;
  demoVideoPostId?: string;
  questions?: ProductQuestion[];
  rating: number;
  reviewsCount: number;
  moderationStatus: 'approved' | 'pending' | 'removed';
}

export interface CategoryConfig {
  slug: string;
  nameEn: string;
  nameBn: string;
  imageUrl: string;
  subCategories: string[];
  isActive: boolean;
}

export interface BrandProfile {
  id: string;
  slug: string;
  nameEn: string;
  nameBn: string;
  taglineEn: string;
  taglineBn: string;
  logoUrl: string;
  bannerUrl: string;
  isDemoPartner: boolean;
  rating: number;
  followersCount: number;
}

export interface CouponCode {
  code: string;
  discountType: 'percent' | 'fixed';
  value: number;
  minSubtotalBdt: number;
  maxDiscountBdt?: number;
  descriptionEn: string;
  descriptionBn: string;
  isActive: boolean;
}

export interface CampaignOffer {
  id: string;
  type: 'flash' | 'bundle' | 'seasonal';
  titleEn: string;
  titleBn: string;
  subtitleEn: string;
  subtitleBn: string;
  badgeEn: string;
  badgeBn: string;
  couponCode?: string;
  productIds: string[];
  imageUrl: string;
}

export interface CartItem {
  productId: string;
  variant: string;
  quantity: number;
  affiliateCode?: string;
}

export type SubOrderStatus =
  | 'pending'
  | 'processing'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export interface SellerSubOrder {
  subOrderId: string;
  sellerId: string;
  shopName: string;
  items: {
    productId: string;
    titleEn: string;
    titleBn: string;
    variant: string;
    quantity: number;
    unitPriceBdt: number;
  }[];
  subtotalBdt: number;
  commissionBdt: number;
  sellerNetBdt: number;
  status: SubOrderStatus;
  courierRef?: string;
}

export interface OrderItem {
  id: string;
  buyerId: string;
  buyerName: string;
  phone: string;
  district: string;
  upazila: string;
  area: string;
  postalCode: string;
  paymentMethod: 'bkash_sandbox' | 'nagad_sandbox' | 'card_sandbox' | 'cod';
  paymentStatus: 'unpaid' | 'paid_sandbox' | 'refunded';
  courierProvider?: 'steadfast_sandbox' | 'pathao_sandbox' | 'redx_sandbox';
  couponCode?: string;
  discountBdt?: number;
  subtotalBdt: number;
  deliveryFeeBdt: number;
  totalBdt: number;
  status: SubOrderStatus | 'confirmed';
  subOrders: SellerSubOrder[];
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  orderId?: string;
  type: 'return' | 'refund' | 'cancel' | 'general';
  subject: string;
  details: string;
  status: 'open' | 'in_review' | 'resolved';
  createdAt: string;
}

export interface NewsletterSubscriber {
  email: string;
  lang: Language;
  createdAt: string;
}

export interface PlatformSettings {
  defaultCommissionPct: number;
  freeDeliveryThresholdBdt: number;
  dhakaDeliveryBdt: number;
  outsideDhakaDeliveryBdt: number;
}

export interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
  sharedProductId?: string;
  createdAt: string;
}

export interface ConversationItem {
  id: string;
  participantIds: string[];
  participantName: string;
  participantAvatar: string;
  lastMessage: string;
  unreadCount: number;
  updatedAt: string;
  messages: MessageItem[];
}

export interface NotificationItem {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'appointment' | 'order' | 'message' | 'admin';
  titleEn: string;
  titleBn: string;
  bodyEn: string;
  bodyBn: string;
  link: string;
  isRead: boolean;
  createdAt: string;
}

export interface ReportItem {
  id: string;
  reporterId: string;
  targetType: 'post' | 'question' | 'product' | 'user';
  targetId: string;
  reason: string;
  details: string;
  status: 'open' | 'reviewed' | 'resolved';
  createdAt: string;
}

export interface AuditLogItem {
  id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  summary: string;
  createdAt: string;
}

export interface SellerProfile {
  id: string;
  userId: string;
  shopName: string;
  shopSlug: string;
  district: string;
  businessType?: string;
  phone?: string;
  isApproved: boolean;
  rating: number;
  followersCount: number;
  commissionRatePct: number;
}
