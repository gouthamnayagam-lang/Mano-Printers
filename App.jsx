import { useEffect, useMemo, useState } from 'react';
import emailjs from '@emailjs/browser';
import {
  ArrowDownRight, ArrowRight, BadgeCheck, BookOpen, CalendarDays, Check,
  ChevronDown, CircleUserRound, Clock3, FileText, Layers3, LockKeyhole,
  LogOut, Mail, Menu, PackageCheck, PenLine, Printer, ShieldCheck,
  Sparkles, Truck, X, Zap,
} from 'lucide-react';
import {
  createUserWithEmailAndPassword, onAuthStateChanged, sendEmailVerification,
  signInWithEmailAndPassword, signOut, updateProfile,
} from 'firebase/auth';
import {
  addDoc, collection, doc, getDocs, query, serverTimestamp, setDoc, updateDoc, where,
} from 'firebase/firestore';
import { ADMIN_EMAIL, auth, db, emailReady, emailConfig, firebaseReady } from './firebase.js';

const BRAND_NAME = 'Mano Printers'; // Change this to your father's actual shop/business name.
const ORDER_STATUSES = ['New', 'Confirmed', 'In production', 'Completed', 'Cancelled'];

const services = [
  {
    icon: BookOpen,
    number: '01',
    title: 'Custom diaries',
    description: 'Branded diaries, notebooks, planners and everyday stationery.',
    tags: ['Hard cover', 'Custom pages'],
    product: 'Custom diary printing',
    visual: 'diary',
  },
  {
    icon: CalendarDays,
    number: '02',
    title: 'Calendars that stand out',
    description: 'Wall calendars, table calendars and year planners for your brand.',
    tags: ['Wall & table', 'Yearly layouts'],
    product: 'Calendar printing',
    visual: 'calendar',
  },
  {
    icon: Layers3,
    number: '03',
    title: 'Business printing',
    description: 'Bills, letterheads, visiting cards, brochures and custom print jobs.',
    tags: ['Business stationery', 'Bulk orders'],
    product: 'Business stationery',
    visual: 'cards',
  },
];

const initialOrder = {
  productType: 'Custom diary printing',
  quantity: '100',
  size: 'A5',
  paper: '80 GSM',
  binding: 'Hard cover',
  phone: '',
  deliveryAddress: '',
  neededBy: '',
  designBrief: '',
};

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <span className="mark-sheet mark-sheet-back" />
      <span className="mark-sheet mark-sheet-front"><span /></span>
    </span>
  );
}

function FloatingPrints() {
  return (
    <div className="showcase" aria-label="3D-style preview of printed diaries and calendars">
      <div className="orbit orbit-one" />
      <div className="orbit orbit-two" />
      <div className="showcase-glow" />
      <div className="float-label label-top"><span className="label-dot" /> Premium finish <Sparkles size={14} /></div>
      <div className="book-3d">
        <div className="book-pages" />
        <div className="book-cover">
          <div className="cover-symbol"><span /><span /><span /></div>
          <div className="cover-name">MAKE<br />IT MATTER.</div>
          <div className="cover-caption">YOUR BRAND · YOUR STORY</div>
          <div className="cover-rule" />
        </div>
        <div className="book-spine" />
      </div>
      <div className="calendar-3d">
        <div className="cal-top"><span>2027</span><span className="cal-sun">✳</span></div>
        <div className="cal-month">JANUARY</div>
        <div className="cal-week"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div>
        <div className="cal-grid">
          {Array.from({ length: 35 }, (_, i) => <span className={i === 16 ? 'cal-picked' : ''} key={i}>{i < 3 ? '' : i - 2 <= 31 ? i - 2 : ''}</span>)}
        </div>
        <div className="cal-base" />
      </div>
      <div className="business-card-3d"><div className="bc-logo"><span /><span /><span /></div><strong>GOOD IDEAS<br />DESERVE PRINT.</strong><small>PRINT WITH PURPOSE</small><div className="bc-stripe" /></div>
      <div className="float-label label-bottom"><Printer size={15} /> Made to make an impression</div>
      <div className="showcase-index"><span>01</span><i /> PRINT OBJECTS</div>
    </div>
  );
}

function Modal({ title, subtitle, onClose, children, wide = false }) {
  useEffect(() => {
    const closeOnEscape = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`modal-card ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <button className="icon-button modal-close" onClick={onClose} aria-label="Close"><X size={19} /></button>
        <div className="modal-brand"><BrandMark /><span>{BRAND_NAME}<small>DIARIES · CALENDARS</small></span></div>
        <h2>{title}</h2>
        <p className="modal-subtitle">{subtitle}</p>
        {children}
      </section>
    </div>
  );
}

function Field({ label, children, className = '' }) {
  return <label className={`field ${className}`}><span>{label}</span>{children}</label>;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('signin');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [order, setOrder] = useState(initialOrder);
  const [orderBusy, setOrderBusy] = useState(false);
  const [notice, setNotice] = useState({ type: '', text: '' });
  const [showOrders, setShowOrders] = useState(false);
  const [orders, setOrders] = useState([]);
  const [ordersBusy, setOrdersBusy] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = Boolean(user?.email && user.emailVerified && ADMIN_EMAIL && user.email.toLowerCase() === ADMIN_EMAIL);

  useEffect(() => {
    if (!firebaseReady) {
      setAuthReady(true);
      return undefined;
    }
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user || !showOrders || !firebaseReady) return undefined;
    let active = true;
    async function fetchOrders() {
      setOrdersBusy(true);
      setOrdersError('');
      try {
        const ordersRef = collection(db, 'orders');
        const ordersQuery = isAdmin ? ordersRef : query(ordersRef, where('userId', '==', user.uid));
        const snapshot = await getDocs(ordersQuery);
        const rows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
        rows.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        if (active) setOrders(rows);
      } catch (error) {
        if (active) setOrdersError(explainFirebaseError(error));
      } finally {
        if (active) setOrdersBusy(false);
      }
    }
    fetchOrders();
    return () => { active = false; };
  }, [user, showOrders, isAdmin]);

  const greeting = useMemo(() => user?.displayName?.trim()?.split(' ')[0] || 'there', [user]);

  function openAuth(mode = 'signin') {
    setAuthMode(mode);
    setAuthError('');
    setAuthSuccess('');
    setAuthOpen(true);
    setMobileMenuOpen(false);
  }

  function changeAuthMode(mode) {
    setAuthMode(mode);
    setAuthError('');
    setAuthSuccess('');
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    if (!firebaseReady) {
      setAuthError('Firebase setup is not finished yet. Follow SETUP.md, then restart the website.');
      return;
    }
    if (authForm.password.length < 6) {
      setAuthError('Password must contain at least 6 characters.');
      return;
    }
    setAuthBusy(true);
    try {
      if (authMode === 'signup') {
        const credential = await createUserWithEmailAndPassword(auth, authForm.email.trim(), authForm.password);
        const customerName = authForm.name.trim();
        const isOwnerEmail = Boolean(ADMIN_EMAIL && credential.user.email?.toLowerCase() === ADMIN_EMAIL);
        if (customerName) await updateProfile(credential.user, { displayName: customerName });
        if (isOwnerEmail) await sendEmailVerification(credential.user);
        await setDoc(doc(db, 'users', credential.user.uid), {
          uid: credential.user.uid,
          name: customerName,
          email: credential.user.email,
          createdAt: serverTimestamp(),
        });
        setUser(credential.user);
        setAuthSuccess(isOwnerEmail
          ? 'Business-owner account created. Verify the link sent to that inbox, then sign out and sign back in to unlock the order desk.'
          : 'Account created successfully. You can now place your order.');
      } else {
        const credential = await signInWithEmailAndPassword(auth, authForm.email.trim(), authForm.password);
        const isUnverifiedOwner = Boolean(ADMIN_EMAIL && credential.user.email?.toLowerCase() === ADMIN_EMAIL && !credential.user.emailVerified);
        if (isUnverifiedOwner) {
          await sendEmailVerification(credential.user);
          setAuthSuccess('This is the business-owner email, but it is not verified yet. A verification link has been sent. Verify it, then sign out and sign back in.');
        } else {
          setAuthSuccess('Signed in successfully. You can now place your order.');
        }
      }
      window.setTimeout(() => setAuthOpen(false), 700);
    } catch (error) {
      setAuthError(explainFirebaseError(error));
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleLogout() {
    if (!firebaseReady) return;
    try {
      await signOut(auth);
      setUser(null);
      setOrders([]);
      setShowOrders(false);
      setNotice({ type: 'success', text: 'You have signed out.' });
    } catch (error) {
      setNotice({ type: 'error', text: explainFirebaseError(error) });
    }
  }

  function updateOrder(field, value) {
    setOrder((current) => ({ ...current, [field]: value }));
  }

  function chooseProduct(product) {
    setOrder((current) => ({ ...current, productType: product }));
    document.getElementById('order')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function handleOrderSubmit(event) {
    event.preventDefault();
    setNotice({ type: '', text: '' });
    if (!firebaseReady) {
      setNotice({ type: 'error', text: 'Website setup is not complete yet. Please finish Firebase setup in SETUP.md first.' });
      return;
    }
    if (!user) {
      setNotice({ type: 'error', text: 'Sign in or create an account first. Your order form details will stay here.' });
      openAuth('signin');
      return;
    }
    const phoneDigits = order.phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      setNotice({ type: 'error', text: 'Enter a valid contact number (at least 10 digits).'});
      return;
    }
    if (!Number.isInteger(Number(order.quantity)) || Number(order.quantity) < 1 || Number(order.quantity) > 100000) {
      setNotice({ type: 'error', text: 'Quantity must be a whole number between 1 and 100,000.' });
      return;
    }
    if (order.deliveryAddress.trim().length < 8) {
      setNotice({ type: 'error', text: 'Please enter a complete delivery address or pickup location.' });
      return;
    }
    setOrderBusy(true);
    let savedOrder;
    try {
      savedOrder = await addDoc(collection(db, 'orders'), {
        userId: user.uid,
        customerName: user.displayName?.trim() || user.email,
        email: user.email,
        phone: order.phone.trim(),
        productType: order.productType,
        quantity: Number(order.quantity),
        size: order.size,
        paper: order.paper,
        binding: order.binding,
        designBrief: order.designBrief.trim().slice(0, 1800),
        deliveryAddress: order.deliveryAddress.trim().slice(0, 700),
        neededBy: order.neededBy || 'Flexible',
        status: 'New',
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      setNotice({ type: 'error', text: `We couldn't save your order. ${explainFirebaseError(error)}` });
      setOrderBusy(false);
      return;
    }

    if (!emailReady) {
      setNotice({ type: 'success', text: `Order saved successfully! Reference: ${savedOrder.id}. Email notification is not configured yet — follow the EmailJS part of SETUP.md.` });
      setOrderBusy(false);
      setOrder(initialOrder);
      return;
    }

    try {
      await emailjs.send(emailConfig.serviceId, emailConfig.templateId, {
        order_id: savedOrder.id,
        customer_name: user.displayName?.trim() || user.email,
        customer_email: user.email,
        customer_phone: order.phone.trim(),
        product_type: order.productType,
        quantity: String(order.quantity),
        size: order.size,
        paper: order.paper,
        binding: order.binding,
        design_brief: order.designBrief.trim() || 'No extra design notes provided',
        delivery_address: order.deliveryAddress.trim(),
        needed_by: order.neededBy || 'Flexible',
        created_at: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      }, { publicKey: emailConfig.publicKey });
      setNotice({ type: 'success', text: `Order placed! Reference: ${savedOrder.id}. The order is saved and an email notification was sent.` });
    } catch (error) {
      console.error('EmailJS notification failed:', error);
      setNotice({ type: 'warning', text: `Your order was saved (reference: ${savedOrder.id}), but the email notification failed. Please check the EmailJS template settings.` });
    } finally {
      setOrderBusy(false);
      setOrder(initialOrder);
    }
  }

  async function changeOrderStatus(orderId, status) {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status });
      setOrders((current) => current.map((item) => item.id === orderId ? { ...item, status } : item));
    } catch (error) {
      setOrdersError(explainFirebaseError(error));
    }
  }

  const scrollToOrder = () => document.getElementById('order')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="site-shell">
      <div className="announcement"><span className="announcement-dot" /> CUSTOM PRINTING · DIARIES · CALENDARS <span className="announcement-divider">/</span> MADE AROUND YOUR IDEAS</div>
      <header className="site-header">
        <a href="#home" className="brand" aria-label={`${BRAND_NAME} home`}><BrandMark /><span className="brand-word">{BRAND_NAME}<small>PRINT STUDIO</small></span></a>
        <button className="mobile-menu-button icon-button" onClick={() => setMobileMenuOpen((open) => !open)} aria-label="Toggle navigation">{mobileMenuOpen ? <X /> : <Menu />}</button>
        <nav className={`main-nav ${mobileMenuOpen ? 'nav-open' : ''}`}>
          <a href="#services" onClick={() => setMobileMenuOpen(false)}>What we print</a>
          <a href="#process" onClick={() => setMobileMenuOpen(false)}>How it works</a>
          <a href="#about" onClick={() => setMobileMenuOpen(false)}>Our promise</a>
          <button className="nav-order" onClick={() => { scrollToOrder(); setMobileMenuOpen(false); }}>Start an order <ArrowUpRightIcon /></button>
        </nav>
        <div className="header-actions">
          {user ? (
            <>
              <button className="account-button" onClick={() => { setShowOrders((value) => !value); setMobileMenuOpen(false); }}><CircleUserRound size={16} /> {isAdmin ? 'Order desk' : 'My orders'}</button>
              <button className="sign-in-button" onClick={handleLogout} title="Sign out"><LogOut size={17} /></button>
            </>
          ) : (
            <button className="sign-in-button" onClick={() => openAuth('signin')}><CircleUserRound size={16} /> Sign in</button>
          )}
        </div>
      </header>

      <main>
        {!authReady && <div className="auth-loading"><span className="spinner" /> Checking your account…</div>}
        {user && <div className="welcome-strip"><span>Welcome back, <strong>{greeting}</strong>.</span><span>{isAdmin ? 'Business owner account' : 'Your account is ready for your next order.'}</span></div>}
        {showOrders && user && (
          <section className="orders-panel page-container" aria-live="polite">
            <div className="orders-panel-heading"><div><span className="eyebrow">ACCOUNT SPACE</span><h2>{isAdmin ? 'Incoming orders' : 'Your orders'}</h2><p>{isAdmin ? 'Review customer requests and update their progress.' : 'See the requests you have sent to the print studio.'}</p></div><button className="icon-button" onClick={() => setShowOrders(false)} aria-label="Close orders"><X size={19} /></button></div>
            {ordersBusy ? <div className="empty-orders"><span className="spinner" /> Loading orders…</div> : ordersError ? <p className="inline-error">{ordersError}</p> : orders.length === 0 ? <div className="empty-orders"><PackageCheck size={26} /><strong>No orders here yet.</strong><span>Your submitted print requests will appear here.</span></div> : (
              <div className="orders-list">
                {orders.map((item) => (
                  <article className="order-row" key={item.id}>
                    <div className="order-row-icon"><FileText size={20} /></div>
                    <div className="order-row-main"><div className="order-row-title"><strong>{item.productType}</strong><span className={`status-pill status-${String(item.status || 'New').toLowerCase().replaceAll(' ', '-')}`}>{item.status || 'New'}</span></div><p>{item.quantity} copies · {item.size} · {item.paper}</p><small>Ref: {item.id}{item.createdAt?.toDate ? ` · ${item.createdAt.toDate().toLocaleDateString('en-IN')}` : ''}</small>{isAdmin && <div className="admin-details"><span>{item.customerName} · {item.email}</span><span>{item.phone}</span><span>{item.deliveryAddress}</span>{item.designBrief && <span>Notes: {item.designBrief}</span>}</div>}</div>
                    {isAdmin && <label className="status-select"><span>Update status</span><select value={item.status || 'New'} onChange={(event) => changeOrderStatus(item.id, event.target.value)}>{ORDER_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>}
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="hero page-container" id="home">
          <div className="hero-copy">
            <div className="eyebrow hero-eyebrow"><span className="eyebrow-dash" /> YOUR IDEA. OUR PRINT.</div>
            <h1>Make it real.<br /><span>Make it</span> <em>print.</em></h1>
            <p className="hero-description">Thoughtful printing for the things your business puts into the world. Diaries, calendars and custom stationery — made with care, from first idea to final finish.</p>
            <div className="hero-ctas"><button className="button-primary" onClick={scrollToOrder}>Create an order <ArrowRight size={18} /></button><a className="text-link" href="#services">Explore our services <ArrowDownRight size={17} /></a></div>
            <div className="hero-trust"><div className="trust-avatars"><span>✳</span><span>✦</span><span>●</span></div><div><strong>Made for your brand</strong><small>Small details. Lasting impressions.</small></div><div className="hero-trust-divider" /><div className="trust-fact"><strong>01—∞</strong><small>Your idea, your quantity</small></div></div>
          </div>
          <FloatingPrints />
          <div className="hero-side-note"><span>PRINTED WITH PURPOSE</span><span className="side-note-line" /></div>
        </section>

        <section className="ticker" aria-label="Our print services"><div className="ticker-track"><span>DIARIES</span><i>✳</i><span>CALENDARS</span><i>✳</i><span>BUSINESS STATIONERY</span><i>✳</i><span>CUSTOM PRINTS</span><i>✳</i><span>DIARIES</span><i>✳</i><span>CALENDARS</span><i>✳</i><span>BUSINESS STATIONERY</span><i>✳</i></div></section>

        <section className="services-section section-pad" id="services">
          <div className="page-container">
            <div className="section-heading"><div><span className="eyebrow">THE PRINT MENU / 01</span><h2>Good work deserves<br />a <em>great finish.</em></h2></div><p>From everyday essentials to pieces that represent your business, we'll help you find the right print for the right purpose.</p></div>
            <div className="services-grid">
              {services.map((service) => {
                const ServiceIcon = service.icon;
                return <article className={`service-card service-${service.visual}`} key={service.number}>
                  <div className="service-card-top"><span className="service-number">/{service.number}</span><span className="service-icon"><ServiceIcon size={20} strokeWidth={1.7} /></span></div>
                  <div className={`service-art art-${service.visual}`}>
                    {service.visual === 'diary' && <><div className="art-diary-shadow" /><div className="art-diary"><span className="art-diary-spine" /><span className="art-diary-brand">YOUR<br />BRAND.</span><span className="art-diary-line" /><small>2027 / PLANNER</small></div><span className="art-sticker">MADE<br />TO ORDER</span></>}
                    {service.visual === 'calendar' && <><div className="art-calendar"><div className="art-cal-binding">••••••••••</div><div className="art-cal-heading">A YEAR<br /><em>of ideas.</em></div><div className="art-cal-month">JAN <span>2027</span></div><div className="art-cal-days">{Array.from({length: 28}, (_, i) => <i key={i} className={i === 18 ? 'selected-day' : ''}>{i + 1}</i>)}</div></div><span className="art-calendar-chip">12 MONTHS<br />OF IMPACT</span></>}
                    {service.visual === 'cards' && <><div className="art-card-stack"><div className="art-card back-card"><span /><span /><span /></div><div className="art-card front-card"><span className="art-card-symbol">✳</span><strong>YOUR<br />NEXT BIG<br />THING.</strong><small>PRINTED WITH PURPOSE</small><i /></div></div><span className="art-cmyk">C · M · Y · K</span></>}
                  </div>
                  <h3>{service.title}</h3><p>{service.description}</p>
                  <div className="service-tags">{service.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
                  <button className="service-link" onClick={() => chooseProduct(service.product)}>Order this service <ArrowRight size={17} /></button>
                </article>;
              })}
            </div>
          </div>
        </section>

        <section className="process-section section-pad" id="process">
          <div className="page-container process-layout"><div className="process-intro"><span className="eyebrow">NO GUESSWORK / 02</span><h2>From “I have an idea”<br />to <em>“look at that.”</em></h2><p>Getting custom printing should feel simple. Tell us what you're making; we'll follow up to confirm the details and price before production.</p><button className="button-primary" onClick={scrollToOrder}>Tell us what you need <ArrowRight size={18} /></button><div className="process-footnote"><ShieldCheck size={17} /><span>Your order is saved securely with your account.</span></div></div>
            <div className="process-steps"><article><div className="step-icon"><PenLine size={20} /></div><div className="step-content"><span>STEP 01</span><h3>Share the brief</h3><p>Choose your print type, quantity, size and finish. Add notes for anything specific.</p></div><span className="step-number">01</span></article><article><div className="step-icon"><BadgeCheck size={20} /></div><div className="step-content"><span>STEP 02</span><h3>Confirm the details</h3><p>We'll contact you to discuss artwork, final specifications, pricing and timelines.</p></div><span className="step-number">02</span></article><article><div className="step-icon"><Printer size={20} /></div><div className="step-content"><span>STEP 03</span><h3>Print & prepare</h3><p>Once you approve the quote and design, your order can move into production.</p></div><span className="step-number">03</span></article><article><div className="step-icon"><Truck size={20} /></div><div className="step-content"><span>STEP 04</span><h3>Ready for you</h3><p>We coordinate pickup or delivery details with you before the order is handed over.</p></div><span className="step-number">04</span></article></div>
          </div>
        </section>

        <section className="order-section section-pad" id="order">
          <div className="page-container order-layout">
            <div className="order-intro"><span className="eyebrow">LET'S MAKE SOMETHING / 03</span><h2>Your next print<br />starts <em>right here.</em></h2><p>Fill in what you know. It's okay if you're not sure about every detail — we can help you figure it out.</p><div className="order-assurances"><div><span className="assurance-icon"><LockKeyhole size={17} /></span><div><strong>Account-protected orders</strong><small>Your order history stays linked to your account.</small></div></div><div><span className="assurance-icon"><Mail size={17} /></span><div><strong>Direct email notification</strong><small>New requests can notify the business inbox.</small></div></div><div><span className="assurance-icon"><Clock3 size={17} /></span><div><strong>Quote confirmed separately</strong><small>No made-up prices — we'll confirm with you.</small></div></div></div><div className="order-help"><span className="help-mark">✳</span><p>Not sure what to choose?<br /><strong>Describe your idea in the notes.</strong></p></div></div>
            <div className="order-form-card"><div className="form-card-heading"><div><span className="eyebrow">PRINT REQUEST FORM</span><h3>Let's get the details.</h3></div><span className="form-step">01 <i>/ 01</i></span></div>
              {notice.text && <div className={`notice notice-${notice.type}`} role="status"><span>{notice.type === 'success' ? <Check size={17} /> : notice.type === 'warning' ? <Mail size={17} /> : <X size={17} />}</span><p>{notice.text}</p><button onClick={() => setNotice({type:'', text:''})} aria-label="Dismiss message"><X size={15} /></button></div>}
              <form className="order-form" onSubmit={handleOrderSubmit}>
                <Field label="What would you like printed?"><select value={order.productType} onChange={(e) => updateOrder('productType', e.target.value)}><option>Custom diary printing</option><option>Calendar printing</option><option>Business stationery</option><option>Bill books / invoice books</option><option>Brochure / flyer printing</option><option>Wedding / event printing</option><option>Other custom printing</option></select></Field>
                <div className="form-two-col"><Field label="Quantity (copies)"><input type="number" min="1" max="100000" step="1" required value={order.quantity} onChange={(e) => updateOrder('quantity', e.target.value)} /></Field><Field label="Preferred size"><select value={order.size} onChange={(e) => updateOrder('size', e.target.value)}><option>A4</option><option>A5</option><option>A6</option><option>Custom size</option><option>Not sure yet</option></select></Field></div>
                <div className="form-two-col"><Field label="Paper preference"><select value={order.paper} onChange={(e) => updateOrder('paper', e.target.value)}><option>70 GSM</option><option>80 GSM</option><option>100 GSM</option><option>Art paper</option><option>Premium / textured</option><option>Not sure yet</option></select></Field><Field label="Finish / binding"><select value={order.binding} onChange={(e) => updateOrder('binding', e.target.value)}><option>Hard cover</option><option>Soft cover</option><option>Spiral binding</option><option>Stapled</option><option>Glue / perfect binding</option><option>Not applicable</option><option>Need advice</option></select></Field></div>
                <div className="form-divider"><span>CONTACT & DELIVERY</span><i /></div>
                <Field label="Contact number"><input type="tel" autoComplete="tel" required placeholder="10-digit mobile number" value={order.phone} onChange={(e) => updateOrder('phone', e.target.value)} /></Field>
                <Field label="Delivery address / pickup location"><textarea required rows="2" placeholder="Area, town/city and any useful details" value={order.deliveryAddress} onChange={(e) => updateOrder('deliveryAddress', e.target.value)} /></Field>
                <Field label="When do you need it? (optional)"><input type="date" min={new Date().toLocaleDateString('en-CA')} value={order.neededBy} onChange={(e) => updateOrder('neededBy', e.target.value)} /></Field>
                <Field label="Design notes (optional)"><textarea rows="3" maxLength="1800" placeholder="Example: 2027 diary, logo on cover, 200 pages, Tamil + English..." value={order.designBrief} onChange={(e) => updateOrder('designBrief', e.target.value)} /></Field>
                <div className="form-submit-row"><div className="form-safe-note"><LockKeyhole size={15} /><span>{user ? `Placing order as ${user.email}` : 'Sign in is required to submit.'}</span></div><button className="button-primary submit-order" type="submit" disabled={orderBusy || !authReady}>{orderBusy ? <><span className="button-spinner" /> Sending…</> : <>Place request <ArrowRight size={18} /></>}</button></div>
                {!user && <div className="signin-nudge"><span>Already have an account?</span><button type="button" onClick={() => openAuth('signin')}>Sign in</button><span>or</span><button type="button" onClick={() => openAuth('signup')}>Create one</button></div>}
              </form>
            </div>
          </div>
        </section>

        <section className="promise-section section-pad" id="about"><div className="page-container promise-layout"><div className="promise-mark"><BrandMark /><span>GOOD PRINT.<br /><em>GOOD IMPACT.</em></span></div><div className="promise-copy"><span className="eyebrow">THE LITTLE THINGS MATTER / 04</span><h2>It's not just ink<br />on paper. <em>It's your name.</em></h2><p>Your diary gets opened every day. Your calendar stays on the wall all year. We know those details represent you — and that's why every job deserves care.</p><div className="promise-points"><span><Check size={15} /> Clear communication</span><span><Check size={15} /> Custom to your needs</span><span><Check size={15} /> Quote before production</span></div></div></div></section>
      </main>

      <footer className="site-footer"><div className="page-container footer-main"><a href="#home" className="brand footer-brand"><BrandMark /><span className="brand-word">{BRAND_NAME}<small>PRINT STUDIO</small></span></a><p>Made with care. Printed with purpose.</p><button className="footer-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Back to top <ArrowUpRightIcon /></button></div><div className="page-container footer-bottom"><span>© {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.</span><span>DIARIES · CALENDARS · YOUR IDEAS</span><span className="footer-status"><span /> Custom print requests open</span></div></footer>

      {authOpen && <Modal title={authMode === 'signup' ? 'Create your account.' : 'Welcome back.'} subtitle={authMode === 'signup' ? 'A little account makes every print request easier to track.' : 'Sign in to submit an order and see your order history.'} onClose={() => setAuthOpen(false)}>
        <div className="auth-tabs"><button className={authMode === 'signin' ? 'active' : ''} onClick={() => changeAuthMode('signin')}>Sign in</button><button className={authMode === 'signup' ? 'active' : ''} onClick={() => changeAuthMode('signup')}>Create account</button></div>
        {authError && <div className="auth-message auth-error">{authError}</div>}{authSuccess && <div className="auth-message auth-success"><Check size={16} /> {authSuccess}</div>}
        <form className="auth-form" onSubmit={handleAuthSubmit}>
          {authMode === 'signup' && <Field label="Your name"><input autoComplete="name" required value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} placeholder="Full name" /></Field>}
          <Field label="Email address"><input type="email" autoComplete="email" required value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} placeholder="you@example.com" /></Field>
          <Field label="Password"><input type="password" autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} minLength="6" required value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} placeholder="At least 6 characters" /></Field>
          <button className="button-primary auth-submit" type="submit" disabled={authBusy}>{authBusy ? <><span className="button-spinner" /> Please wait…</> : <>{authMode === 'signup' ? 'Create account' : 'Sign in securely'} <ArrowRight size={18} /></>}</button>
        </form>
        {!firebaseReady && <p className="setup-inline-note">Firebase is not connected yet. Follow SETUP.md to activate accounts.</p>}
      </Modal>}

      {!firebaseReady && <div className="dev-ribbon"><span className="ribbon-dot" /> Setup mode — connect Firebase to activate accounts and orders</div>}
    </div>
  );
}

function ArrowUpRightIcon() {
  return <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M7 7h10v10" /></svg>;
}

function explainFirebaseError(error) {
  const code = error?.code || '';
  const messages = {
    'auth/email-already-in-use': 'This email already has an account. Please sign in instead.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/invalid-credential': 'Email or password is incorrect. Please try again.',
    'auth/weak-password': 'Choose a stronger password with at least 6 characters.',
    'auth/too-many-requests': 'Too many attempts. Wait a little and try again.',
    'auth/network-request-failed': 'Network error. Check your internet connection.',
    'permission-denied': 'Database access was blocked. Check that you published the Firestore rules from SETUP.md.',
    'unavailable': 'The service is temporarily unavailable. Check your connection and try again.',
  };
  return messages[code] || error?.message || 'Something went wrong. Please check your setup and try again.';
}
