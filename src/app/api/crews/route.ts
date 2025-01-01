import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { Crew, CreateCrewInput } from "@/lib/types/crew";

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
    console.log("[API] 받은 크루 데이터:", {
      name: data.name,
      location: data.location,
      description: data.description?.slice(0, 50) + "...",
    });

    const crews = await readCrews();
    const now = new Date().toISOString();
    const newCrew: Crew = {
      id: uuidv4(),
      ...data,
      created_at: now,
      //   updated_at: now,
    };

    crews.push(newCrew);
    await writeCrews(crews);
    console.log("[API] 저장된 크루 위치:", {
      name: newCrew.name,
      lat: newCrew.location.lat,
      lng: newCrew.location.lng,
      address: newCrew.location.address,
    });

    return NextResponse.json(newCrew);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create crew" },
      { status: 500 }
    );
  }
}
