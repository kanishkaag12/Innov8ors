'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  BadgeCheck,
  BriefcaseBusiness,
  CheckCheck,
  ClipboardList,
  Coins,
  FileCheck2,
  Github,
  LayoutGrid,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  Users
} from 'lucide-react';

const stats = [
  { label: 'AI Milestones Generated', value: '120K+' },
  { label: 'Projects Secured', value: '35K+' },
  { label: 'Payments Released', value: '$48M+' },
  { label: 'Trusted Freelancers', value: '90K+' }
];

const workflowSteps = [
  {
    title: 'Create Project',
    description: 'Define scope, outcomes, and deadlines in a guided project setup.',
    icon: ClipboardList
  },
  {
    title: 'AI Generates Milestones',
    description: 'SynapEscrow breaks work into smart milestones with payout checkpoints.',
    icon: Sparkles
  },
  {
    title: 'Freelancer Submits Work',
    description: 'Deliverables are submitted against each milestone for transparent review.',
    icon: FileCheck2
  },
  {
    title: 'Payment Released Automatically',
    description: 'Verified milestones trigger secure escrow release with audit history.',
    icon: Coins
  }
];

const features = [
  {
    title: 'AI Milestone Generator',
    description: 'Automatically creates fair milestone plans tailored to project complexity.',
    icon: Sparkles
  },
  {
    title: 'Secure Escrow Payments',
    description: 'Funds stay protected until milestone criteria are validated and approved.',
    icon: ShieldCheck
  },
  {
    title: 'Automated Verification',
    description: 'AI-assisted checks improve trust and reduce manual back-and-forth.',
    icon: CheckCheck
  },
  {
    title: 'Professional Fidelity Index',
    description: 'Track reliability scores for smarter hiring and collaboration decisions.',
    icon: BadgeCheck
  }
];

const marketplace = [
  {
    title: 'Top Freelancers',
    description: 'Discover vetted professionals with proven milestone delivery records.',
    metric: '12,400+ verified profiles',
    icon: Users
  },
  {
    title: 'Active Projects',
    description: 'Browse live opportunities across design, development, and AI workflows.',
    metric: '3,800+ ongoing contracts',
    icon: BriefcaseBusiness
  },
  {
    title: 'AI Verified Deliverables',
    description: 'Review project output validated by intelligent milestone checks.',
    metric: '96% first-pass acceptance',
    icon: UserRoundCheck
  }
];

const fadeIn = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 }
};

export default function HomePage() {
  return (
    <div className="bg-slate-50 pt-6 text-slate-900">
      <section className="mx-auto mt-6 max-w-6xl px-6 py-4">
        <motion.div
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.45, delay: 0.05 }}
          className="flex flex-col items-start justify-between gap-3 rounded-2xl bg-gradient-to-r from-teal-100 to-teal-200 px-6 py-4 text-teal-900 transition-all duration-300 hover:shadow-lg sm:flex-row sm:items-center"
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/70 text-teal-700 shadow-sm">
              <ShieldCheck size={20} />
            </span>
            <p className="text-sm font-medium sm:text-base">
              AI-powered escrow for secure freelance collaboration.
            </p>
          </div>

          <Link
            href="/signup"
            className="rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
          >
            Get Started →
          </Link>
        </motion.div>
      </section>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-12 sm:px-6 md:grid-cols-2" id="hire">
        <motion.div
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.55 }}
          className="space-y-6"
        >
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Secure AI-powered escrow for freelance projects
          </h1>
          <p className="max-w-xl text-lg text-slate-600">
            Automatically generate milestones, verify deliverables, and release payments with AI.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/signup" className="rounded-lg bg-teal-600 px-6 py-3 font-semibold text-white transition hover:bg-teal-700">
              Hire Talent
            </Link>
            <Link href="/signup" className="rounded-lg border border-teal-600 px-6 py-3 font-semibold text-teal-600 transition hover:bg-teal-50">
              Start Freelancing
            </Link>
          </div>
        </motion.div>

        <motion.div
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.55, delay: 0.1 }}
          className="relative"
        >
          <div className="relative w-full h-[420px] rounded-2xl overflow-hidden shadow-xl bg-slate-100">
            {/* Mobile fallback image could go here; hiding video on mobile */}
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover rounded-2xl"
            >
              <source src="/videos/hero.mp4" type="video/mp4" />
            </video>
            
            <div className="absolute inset-0 bg-black/20"></div>
            
            <div className="absolute bottom-6 left-6 bg-white p-4 rounded-xl shadow">
              <div className="text-sm font-medium text-slate-500">Escrow confidence</div>
              <div className="text-xl font-bold text-teal-700">99.2%</div>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6" id="work">
        <div className="grid gap-6 md:grid-cols-4">
          {stats.map((item, index) => (
            <motion.div
              key={item.label}
              variants={fadeIn}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.45, delay: index * 0.05 }}
              whileHover={{ y: -6 }}
              className="rounded-xl bg-white p-6 text-center shadow-md transition"
            >
              <p className="text-3xl font-bold text-teal-700">{item.value}</p>
              <p className="mt-2 text-sm font-medium text-slate-600">{item.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6" id="how-it-works">
        <motion.div
          variants={fadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.45 }}
          className="mb-8"
        >
          <h2 className="text-3xl font-bold tracking-tight">How SynapEscrow Works</h2>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-4">
          {workflowSteps.map((step, index) => {
            const Icon = step.icon;

            return (
              <motion.article
                key={step.title}
                variants={fadeIn}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.45, delay: index * 0.06 }}
                whileHover={{ y: -5 }}
                className="rounded-xl bg-white p-6 shadow-lg transition hover:shadow-xl"
              >
                <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
                  <Icon size={20} />
                </span>
                <h3 className="text-lg font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{step.description}</p>
              </motion.article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <motion.div
          variants={fadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.45 }}
          className="mb-8"
        >
          <h2 className="text-3xl font-bold tracking-tight">Why Use SynapEscrow</h2>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <motion.article
                key={feature.title}
                variants={fadeIn}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.45, delay: index * 0.06 }}
                whileHover={{ y: -5 }}
                className="rounded-xl bg-white p-6 shadow-lg transition hover:shadow-xl"
              >
                <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
                  <Icon size={20} />
                </span>
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{feature.description}</p>
              </motion.article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6" id="pricing">
        <motion.div
          variants={fadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.45 }}
          className="mb-8"
        >
          <h2 className="text-3xl font-bold tracking-tight">Marketplace Preview</h2>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-3">
          {marketplace.map((item, index) => {
            const Icon = item.icon;

            return (
              <motion.article
                key={item.title}
                variants={fadeIn}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.45, delay: index * 0.06 }}
                whileHover={{ y: -6 }}
                className="rounded-xl bg-white p-6 shadow-lg transition hover:shadow-xl"
              >
                <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
                  <Icon size={20} />
                </span>
                <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{item.description}</p>
                <p className="mt-4 text-sm font-semibold text-teal-700">{item.metric}</p>
              </motion.article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
        <motion.div
          variants={fadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.45 }}
          transition={{ duration: 0.45 }}
          className="rounded-2xl bg-teal-700 p-8 text-center text-white shadow-xl sm:p-12"
        >
          <h2 className="text-3xl font-bold tracking-tight">Start secure freelance collaboration today.</h2>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link href="/signup" className="rounded-lg bg-white px-6 py-3 font-semibold text-teal-700 transition hover:bg-teal-50">
              Create Account
            </Link>
            <Link href="/dashboard/employer" className="rounded-lg border border-white px-6 py-3 font-semibold text-white transition hover:bg-teal-600">
              Explore Projects
            </Link>
          </div>
        </motion.div>
      </section>

    </div>
  );
}
