import prisma from './prisma.js';

async function seed() {
  console.log('🌱 Seeding database with initial data matching Figma mockups...');

  // 1. Seed User
  const user = await prisma.user.upsert({
    where: { email: 'oliver.brown@domain.io' },
    update: {},
    create: {
      email: 'oliver.brown@domain.io',
      name: 'Oliver Brown',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    },
  });

  console.log(`👤 Seeded User: ${user.name} (${user.email})`);

  // 2. Seed Senders
  const oliverSender = await prisma.senderAccount.upsert({
    where: { email: 'oliver.brown@domain.io' },
    update: {},
    create: {
      email: 'oliver.brown@domain.io',
      name: 'Oliver Brown',
      isDefault: true,
    },
  });

  const amandaSender = await prisma.senderAccount.upsert({
    where: { email: 'sender@example.com' },
    update: {},
    create: {
      email: 'sender@example.com',
      name: 'Amanda Clark',
      isDefault: false,
    },
  });

  await prisma.senderAccount.upsert({
    where: { email: 'sarah.wilson@domain.io' },
    update: {},
    create: {
      email: 'sarah.wilson@domain.io',
      name: 'Sarah Wilson',
      isDefault: false,
    },
  });

  // 3. Seed Scheduled Emails (matching Screenshot 2)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 15, 12, 0);

  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);
  dayAfter.setHours(20, 15, 12, 0);

  const scheduledSamples = [
    {
      senderId: oliverSender.id,
      senderEmail: oliverSender.email,
      recipientEmail: 'john.smith@acme.com',
      recipientName: 'John Smith',
      subject: 'Meeting follow-up - Scheduled',
      body: 'Hi John, just wanted to follow up on our meeting yesterday and discuss next steps for onboarding.',
      status: 'SCHEDULED',
      scheduledAt: tomorrow,
      delaySeconds: 2,
      hourlyLimit: 100,
    },
    {
      senderId: oliverSender.id,
      senderEmail: oliverSender.email,
      recipientEmail: 'olive@techstart.io',
      recipientName: 'Olive',
      subject: "Ramit, great to meet you - you'll love it",
      body: 'Hi Olive, just wanted to follow up on our meeting. Sharing the presentation materials we spoke about.',
      status: 'SCHEDULED',
      scheduledAt: dayAfter,
      delaySeconds: 2,
      hourlyLimit: 100,
    },
  ];

  for (const sample of scheduledSamples) {
    const existing = await prisma.email.findFirst({
      where: { recipientEmail: sample.recipientEmail, subject: sample.subject },
    });
    if (!existing) {
      await prisma.email.create({ data: sample });
    }
  }

  // 4. Seed Sent Emails (matching Screenshot 3 & 4)
  const pastOne = new Date(Date.now() - 3600000 * 24 * 2);
  const pastTwo = new Date(Date.now() - 3600000 * 24 * 3);
  const pastThree = new Date(Date.now() - 3600000 * 5);

  const sentSamples = [
    {
      senderId: oliverSender.id,
      senderEmail: oliverSender.email,
      recipientEmail: 'sarah.wilson@client.org',
      recipientName: 'Sarah Wilson',
      subject: 'Re: Project Update',
      body: 'Thanks for the update, Sarah. Looks good! Everything is aligned for our release.',
      status: 'SENT',
      scheduledAt: pastOne,
      sentAt: pastOne,
      messageId: '<msg-sarah-01@ethereal.email>',
      previewUrl: 'https://ethereal.email',
    },
    {
      senderId: oliverSender.id,
      senderEmail: oliverSender.email,
      recipientEmail: 'support@reachinbox.ai',
      recipientName: 'Support',
      subject: 'Issue with login',
      body: 'I am having trouble logging in to the dashboard with my backup email address.',
      status: 'SENT',
      scheduledAt: pastTwo,
      sentAt: pastTwo,
      messageId: '<msg-support-02@ethereal.email>',
      previewUrl: 'https://ethereal.email',
    },
    {
      senderId: amandaSender.id,
      senderEmail: amandaSender.email,
      recipientEmail: 'oliver.brown@domain.io',
      recipientName: 'Oliver Brown',
      subject: 'Oliver, hello there! | MJWYT44 BM#52W01',
      body: `<p>Hey Oliver,</p>
<p>You've just RECEIVED something</p>
<div style="background-color: #fef9c3; border-left: 4px solid #f59e0b; padding: 14px 18px; margin: 16px 0; border-radius: 4px; font-weight: 500;">
  ⚡ <strong>Extremely Exclusive—Only 4 Spots Worldwide Per Year | $25,000 investment</strong> ⚡<br/>
  ⚡ To explore securing your private transformation, simply reply right now with <strong>"FLY OUT FIX"</strong>.
</div>
<p>Your coach for world-class performance,</p>
<p><strong>Grant</strong></p>
<p><em>P.S. Always remember that you can develop world class technique! 🚀</em></p>`,
      status: 'SENT',
      scheduledAt: pastThree,
      sentAt: pastThree,
      messageId: '<msg-amanda-03@ethereal.email>',
      previewUrl: 'https://ethereal.email',
      metadata: JSON.stringify({
        attachments: [
          {
            filename: 'Tennis_Coach_Profile.png',
            size: '1.2 MB',
            thumbnail: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=300',
          },
          {
            filename: 'Tennis_Coach_Profile2.png',
            size: '1.2 MB',
            thumbnail: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=300',
          },
        ],
      }),
    },
  ];

  for (const sample of sentSamples) {
    const existing = await prisma.email.findFirst({
      where: { recipientEmail: sample.recipientEmail, subject: sample.subject },
    });
    if (!existing) {
      await prisma.email.create({ data: sample });
    }
  }

  console.log('✅ Seeding completed successfully!');
}

seed()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
