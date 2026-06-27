import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

const FAQS = [
  {
    question: "Is Jira really free to get started?",
    answer: "Yes! Jira offers a free plan for up to 10 users with 2GB of storage. You get access to key features like Scrum/Kanban boards, backlog tracking, roadmaps, and automation integrations without ever entering a credit card."
  },
  {
    question: "Can we migrate our tasks from Trello or Excel?",
    answer: "Absolutely. Jira includes a built-in CSV/Trello importer that lets you easily map your boards, lists, issues, and users into Jira in under 5 minutes. You won't lose history, comments, or attachments."
  },
  {
    question: "What is the difference between Jira Software and Jira Service Management?",
    answer: "Jira Software is designed for development and product teams to track sprints, backlogs, releases, and codebase integrations. Jira Service Management is an IT service desk solution built for incident management, customer ticket queues, SLAs, and asset tracking."
  },
  {
    question: "How does Jira handle enterprise scaling and security?",
    answer: "Jira provides enterprise-grade compliance out of the box, including SOC2 Type II, GDPR alignment, and ISO 27001 certifications. With our Premium and Enterprise tiers, you gain access to 99.9% uptime SLAs, unlimited storage, sandboxes, and automated user provisioning."
  },
  {
    question: "Does Jira support automation out of the box?",
    answer: "Yes, Jira comes with a powerful no-code automation engine. You can set rules such as 'When a commit is merged on GitHub, transition Jira issue to Ready to Test' or 'When a bug is created, auto-assign it to the on-call engineer'."
  }
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleFAQ = (index) => {
    setOpenIndex(prev => (prev === index ? null : index));
  };

  return (
    <section className="relative py-20 bg-dominant transition-colors duration-300 overflow-hidden">


      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <HelpCircle className="w-10 h-10 text-accent mx-auto mb-4" />
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-text-secondary tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-text-secondary-muted text-sm sm:text-base">
            Got questions about getting started? Here are answers to our most common queries.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-4">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div 
                key={idx}
                className={`bg-card-secondary rounded-xl border transition-all duration-200 ${
                  isOpen ? 'border-accent shadow-sm' : 'border-border-secondary'
                } overflow-hidden`}
              >
                {/* Accordion Trigger Header */}
                <button
                  onClick={() => toggleFAQ(idx)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none hover:bg-dominant-offset cursor-pointer"
                >
                  <span className="font-bold text-text-secondary text-sm sm:text-base pr-4">
                    {faq.question}
                  </span>
                  <ChevronDown className={`w-5 h-5 text-text-secondary-muted flex-shrink-0 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-accent' : ''
                  }`} />
                </button>

                {/* Accordion Content Body */}
                <div 
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    isOpen ? 'max-h-60 border-t border-border-secondary' : 'max-h-0'
                  }`}
                >
                  <div className="p-6 text-sm text-text-secondary-muted leading-relaxed bg-card-secondary">
                    {faq.answer}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
