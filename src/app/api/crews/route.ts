import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { CrewWithDetails as Crew, CreateCrewInput } from "@/lib/types/crew";

const DATA_FILE_PATH = path.join(process.cwd(), "data", "crews.json");

async function initializeDataFile() {
  try {
    await fs.mkdir(path.dirname(DATA_FILE_PATH), { recursive: true });
    try {
      await fs.access(DATA_FILE_PATH);
    } catch {
      await fs.writeFile(DATA_FILE_PATH, "[]");
    }
  } catch (error) {
    console.error("Failed to initialize data file:", error);
    throw error;
  }
}

async function readCrews(): Promise<Crew[]> {
  await initializeDataFile();
  const data = await fs.readFile(DATA_FILE_PATH, "utf-8");
  return JSON.parse(data);
}

async function writeCrews(crews: Crew[]): Promise<void> {
  await fs.writeFile(DATA_FILE_PATH, JSON.stringify(crews, null, 2));
}

export async function GET() {
  try {
    const crews = await readCrews();
    return NextResponse.json(crews);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch crews" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data: CreateCrewInput = await request.json();
    const crews = await readCrews();
    const now = new Date().toISOString();

    const newCrew: Crew = {
      id: uuidv4(),
      name: data.name,
      description: data.description,
      instagram: data.instagram,
      logo_image_url: undefined, // Will be updated after file upload
      created_at: now,
      updated_at: now,
      location: {
        main_address: data.location.main_address,
        detail_address: data.location.detail_address,
        latitude: data.location.latitude,
        longitude: data.location.longitude,
      },
      activity_days: data.activity_days,
      age_range: {
        min_age: data.age_range.min_age,
        max_age: data.age_range.max_age,
      },
    };

    crews.push(newCrew);
    await writeCrews(crews);

    return NextResponse.json(newCrew, { status: 201 });
  } catch (error) {
    console.error("Failed to create crew:", error);
    return NextResponse.json(
      { error: "Failed to create crew" },
      { status: 500 }
    );
  }
}
