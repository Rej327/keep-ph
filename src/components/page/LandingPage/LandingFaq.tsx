import {
  Container,
  Title,
  Text,
  Accordion,
  AccordionItem,
  AccordionControl,
  AccordionPanel,
  Stack,
} from "@mantine/core";

const faqs = [
  {
    question: "How does Keep PH work?",
    answer:
      "We provide you with a secure physical address where your mail is received. We scan and digitize your mail, then notify you immediately. You can view, manage, and request actions on your mail through our secure online platform.",
  },
  {
    question: "Is my mail secure?",
    answer:
      "Absolutely. All mail is stored in secure, locked facilities with 24/7 surveillance. Digital scans are encrypted and stored in bank-level secure cloud storage. We never share your information without your explicit permission.",
  },
  {
    question: "What types of mail can you handle?",
    answer:
      "We handle all types of mail including letters, packages, magazines, and even checks. We can deposit checks directly into your bank account and forward packages as needed.",
  },
  {
    question: "How long do you store my physical mail?",
    answer:
      "Physical mail is retained for 7 days by default on our digital plans. You can extend storage or request shredding at any time. Our business plans offer extended storage options.",
  },
  {
    question: "Can I receive packages?",
    answer:
      "Yes! We handle packages up to certain size and weight limits. You'll be notified when packages arrive, and you can choose to have them forwarded to your desired address or held for pickup.",
  },
  {
    question: "What if I need my original documents?",
    answer:
      "You can request original documents at any time. We offer secure forwarding services worldwide. For urgent documents, we can arrange expedited delivery.",
  },
  {
    question: "Do you offer virtual office services?",
    answer:
      "Yes, our Business plan includes virtual office services with a premium address, mail handling, and receptionist services for a professional business presence.",
  },
  {
    question: "How do I get started?",
    answer:
      "Simply sign up online, choose your plan, and we'll provide you with your new digital address. You can start receiving mail immediately while your account is being set up.",
  },
];

export function LandingFaq() {
  return (
    <Container size="xl" py={80} id="faq">
      <Stack align="center" mb={50}>
        <Title order={2} ta="center">
          Frequently Asked Questions
        </Title>
        <Text c="dimmed" ta="center" maw={600}>
          Find answers to common questions about our mail digitization services.
        </Text>
      </Stack>

      <Accordion variant="separated" radius="md">
        {faqs.map((faq, index) => (
          <AccordionItem key={index} value={faq.question}>
            <AccordionControl>
              <Text fw={500}>{faq.question}</Text>
            </AccordionControl>
            <AccordionPanel>
              <Text c="dimmed" size="sm">
                {faq.answer}
              </Text>
            </AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>
    </Container>
  );
}
