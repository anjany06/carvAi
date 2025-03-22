"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { revalidatePath } from "next/cache";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});
export async function saveResume(content) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorised");

  const user = await db.user.findUnique({
    where: {
      clerkUserId: userId,
    },
  });

  if (!user) throw new Error("User not found");

  try {
    // upsert means update and insert
    //and it is used to update if resume presents and insert or create if not
    const resume = await db.resume.upsert({
      where: {
        userId: user.id,
      },
      update: {
        content: content,
      },
      create: {
        userId: user.id,
        content,
      },
    });

    //refetch all the resume after creating or updating in the /resume
    revalidatePath("/resume");
    return resume;
  } catch (error) {
    console.log("Error saving resume : ", error.message);
    throw new Error("Failed to save resume");
  }
}

export async function getResume() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorised");

  const user = await db.user.findUnique({
    where: {
      clerkUserId: userId,
    },
  });

  if (!user) throw new Error("User not found");

  return await db.resume.findUnique({
    where: {
      userId: user.id,
    },
  });
}

export async function improveWithAI({ current, type }) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorised");

  const user = await db.user.findUnique({
    where: {
      clerkUserId: userId,
    },
    include: {
      industryInsight: true,
    },
  });

  if (!user) throw new Error("User not found");

  const prompt = `
    As an expert resume writer, improve the following ${type} description for a professional ${user.industry} .
    Make it more impactful, quantifiable, and aligned with industry standards.
    Current content: "${current}"

    Requirements:
    1. Use action verbs
    2. Include metrics and results where possible
    3. Highlight relevant technical skills
    4. Keep it concise but detailed
    5. Focus on achievements over responsibilities
    6. Use industry-specific keywords
    
    Format the response as a single paragraph without any additional text or explanations.
  `;
  try {
    const result = await model.generateContent(prompt);
    const response = result.response;

    const improvedContent = response.text().trim();
    return improvedContent;
  } catch (error) {
    console.error("Error improving content : ", error);
    throw new Error("Failed to improve content");
  }
}
export async function improveSummary({ current }) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorised");

  const user = await db.user.findUnique({
    where: {
      clerkUserId: userId,
    },
    include: {
      industryInsight: true,
    },
  });

  if (!user) throw new Error("User not found");

  const prompt = `
  As an expert resume writer, enhance the following professional summary for a professional ${user.industry} to make it more impactful, quantifiable, and aligned with industry standards.
  Current Content "${current}"
  
  Requirements
  1.Utilize action verbs to describe achievements
  2.Incorporate metrics and results to demonstrate impact
  3.Highlight relevant technical skills and certifications
  4.Maintain a concise yet detailed tone
  5.Emphasize achievements and accomplishments over job responsibilities
  6.Incorporate industry-specific keywords and phrases
  7.Limit response to 70-75 words

  Format the response as a single paragraph without any additional text or explanations.
  Deliverable Format the response as a single paragraph, optimized for a professional resume.
  `;
  try {
    const result = await model.generateContent(prompt);
    const response = result.response;

    const improvedContent = response.text().trim();
    return improvedContent;
  } catch (error) {
    console.error("Error improving content : ", error);
    throw new Error("Failed to improve content");
  }
}
