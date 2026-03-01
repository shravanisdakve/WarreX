import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const sendEmail = async (to: string, subject: string, text: string) => {
    console.log(`Configuring email for ${process.env.EMAIL_USER}...`);
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log(`[MOCK EMAIL] To: ${to}, Subject: ${subject}, Body: ${text}`);
        return true;
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    try {
        console.log('Sending email...');
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to,
            subject,
            text,
        });
        console.log('Email sent successfully!');
        return true;
    } catch (err: any) {
        console.error('Email sending failed:', err.message);
        return false;
    }
};

async function test() {
    const success = await sendEmail(process.env.EMAIL_USER || 'test@example.com', 'Test Subject', 'Test Body');
    process.exit(success ? 0 : 1);
}

test();
