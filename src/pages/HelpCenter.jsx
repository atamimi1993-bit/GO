import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { HelpCircle, User, Truck, BookOpen, Bot, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import PullToRefresh from '@/components/go/PullToRefresh';
import PageHeader from '@/components/go/PageHeader';

const DEFAULT_FAQ = {
  customer: [
    { title: 'How do I book a move?', content: 'Click "Start a Move" on the home page. Enter your pickup and drop-off addresses, add your items (manually or by uploading a file), review your quote, sign the liability agreement, and submit. A local driver will accept your job.' },
    { title: 'How is the price calculated?', content: 'Your price is based on: total item weight, round-trip distance, truck fuel cost, local tax rate, a 10% GO app fee, and a 5% driver fee. You see the full breakdown before confirming.' },
    { title: 'What if my items are damaged or lost?', content: 'Contact the driver assigned to your move first. If they cannot resolve the issue, the cost will be deducted from their payout. GO facilitates the resolution process.' },
    { title: 'Can I cancel a move?', content: 'You can cancel a pending move from your "My Moves" page. Once a driver has accepted, please contact them directly through the app.' },
    { title: 'Do you offer storage?', content: 'Yes! Visit our Storage page to find climate-controlled and standard storage facilities near your move location.' },
  ],
  driver: [
    { title: 'How do I become a driver?', content: 'Go to Driver Hub and click "Become a GO Driver." Fill out your profile, upload your license, insurance, and a photo. Once approved, you can start accepting jobs.' },
    { title: 'What documents do I need?', content: 'You need a valid driver\'s license, insurance documentation, and your truck\'s registration and inspection documents. All licenses must be current and valid.' },
    { title: 'How do I get paid?', content: 'You earn a payout for each completed job (the subtotal plus a 5% driver fee). View your earnings on the Payouts page in your Driver Hub.' },
    { title: 'What if a customer claims damage?', content: 'You are responsible for items during transit. If a customer reports damage or loss, you should work with them to resolve it. Unresolved claims may result in deductions from your payout.' },
    { title: 'Can I add multiple trucks?', content: 'Yes! Go to "My Trucks" in your Driver Hub to register as many trucks as you operate, from any company. Each truck needs valid registration and insurance.' },
  ],
  general: [
    { title: 'What is GO?', content: 'GO is a marketplace that connects people who need to move their belongings with verified, independent drivers who have trucks of all sizes. Think of it as a rideshare for moving.' },
    { title: 'Is GO available in my area?', content: 'GO operates across all 50 US states. Driver availability varies by location — the more drivers in your area, the faster your job gets accepted.' },
    { title: 'How does GO make money?', content: 'GO charges a 10% app fee on each move, which is included in your quote. This covers platform operations, dispute resolution, and customer support.' },
  ],
};

export default function HelpCenter() {
  const { scrollRef } = useOutletContext();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.HelpArticle.list('order', 50)
      .then(setArticles)
      .finally(() => setLoading(false));
  }, []);

  const getArticles = (category) => {
    const db = articles.filter(a => a.category === category);
    return db.length > 0 ? db : DEFAULT_FAQ[category] || [];
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-muted-foreground" size={32} /></div>;

  return (
    <PullToRefresh scrollRef={scrollRef} onRefresh={async () => { const articles = await base44.entities.HelpArticle.list('order', 50); setArticles(articles); }}>
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <HelpCircle className="text-emerald-600" size={32} />
        </div>
        <PageHeader title="Help Center" isRoot />
        <p className="text-muted-foreground">Find answers for customers, drivers, and general questions.</p>
      </div>

      <Link to="/support" className="flex items-center gap-3 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 mb-6 hover:bg-emerald-500/10 transition-colors">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
          <Bot className="text-emerald-600 dark:text-emerald-400" size={20} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">Chat with the GO Assistant</p>
          <p className="text-xs text-muted-foreground">Get instant answers about your moves, pricing, and more</p>
        </div>
      </Link>

      <Tabs defaultValue="customer">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="customer" className="flex items-center gap-1"><User size={14} /> Customers</TabsTrigger>
          <TabsTrigger value="driver" className="flex items-center gap-1"><Truck size={14} /> Drivers</TabsTrigger>
          <TabsTrigger value="general" className="flex items-center gap-1"><BookOpen size={14} /> General</TabsTrigger>
        </TabsList>

        {['customer', 'driver', 'general'].map(cat => (
          <TabsContent key={cat} value={cat}>
            <Accordion type="single" collapsible className="bg-card border rounded-2xl overflow-hidden">
              {getArticles(cat).map((article, i) => (
                <AccordionItem key={article.id || i} value={`${cat}-${i}`}>
                  <AccordionTrigger className="px-5 text-sm font-medium">{article.title}</AccordionTrigger>
                  <AccordionContent className="px-5 text-sm text-muted-foreground leading-relaxed select-text">
                    {article.content}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </TabsContent>
        ))}
      </Tabs>
    </div>
    </PullToRefresh>
  );
}