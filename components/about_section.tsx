'use client'
import { Code } from "lucide-react";
import { CodeSnippetModal } from "@/components/code-snippet-modal";
import { useState } from "react";
import { CODE_SNIPPETS } from "@/lib/codeSnippets";
import uiPreviewImage from '@/public/uipreview.png';
import Image from 'next/image';
import Link from "next/link";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Badge } from "@/components/ui/badge";

const integrationCode = `pnpm dev
# or
npm run dev`
export function AboutSection({ demoLink }: { demoLink: string }) {
  const [openCodeModal, setOpenCodeModal] = useState<string | null>(null)
  return (
    <>
      <div className="max-w-4xl mx-auto space-y-12">
        <div className={'flex justify-between'}>
          <div>
            <div className={'text-3xl font-semibold'}>Pi Search Builder Demo</div>
            <div className={'text-gray-600 mt-2'}>
              Personalize your retrieval stack with natural language feedback
            </div>
          </div>
          <div className={'pt-4'}>
            <Link href={demoLink} className={'p-6 py-4 bg-black hover:bg-zinc-700 text-white font-semibold rounded-md'}>
              View Demo
            </Link>
          </div>
        </div>
        <div className={'border rounded-xl overflow-hidden'}>
          <Image alt={"Ui Preview Image"} src={uiPreviewImage} />
        </div>
        <div className={'grid grid-cols-3 gap-12'}>
          <div className={'space-y-2 col-span-2'}>
            <div className={'font-semibold text-2xl'}>Getting started</div>
            <div className={'text-lg text-gray-600'}>First run the development server:</div>
            <div className={'my-4'}>
              <SyntaxHighlighter

                language="bash"
                style={vscDarkPlus}
                customStyle={{
                  margin: 0,
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  lineHeight: '1.5',
                }}
                showLineNumbers={true}
              >
                {integrationCode}
              </SyntaxHighlighter>
            </div>
            <div className={'text-lg text-gray-600'}>
              Open <span className={'text-blue-600'}>http://localhost:3000</span> with your browser to see the result.
            </div>
          </div>
          <div className={'space-y-6'}>
            <div className={'space-y-2'}>
              <div className={'font-semibold text-lg'}>Github Repo</div>
              <Link
                className={'font-semibold text-blue-600'}
                href={'https://github.com/withpi/search-builder'}
              >
                withpi/search-builder
              </Link>
            </div>
            <div className={'space-y-2 flex flex-col'}>
              <div className={'font-semibold text-lg'}>Use Cases</div>
              <Badge variant={'outline'}>
                RAG
              </Badge>
              <Badge variant={'outline'}>
                Tool choice
              </Badge>
              <Badge variant={'outline'}>
                Starter template
              </Badge>
            </div>
          </div>
        </div>
        {/* Part 1: Upload your corpus */}
        <div className="flex gap-8 items-center">
          <div className="flex-[0.6] aspect-video rounded-lg overflow-hidden">
            <iframe
              width="100%"
              height="100%"
              src="https://www.youtube.com/embed/zGpgjPb7Ntk?si=Z1ns5iLP2XObSNHg" 
              title="YouTube video player" 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
              referrerPolicy="strict-origin-when-cross-origin" 
              allowFullScreen
            />
          </div>
          <div className="flex-1 space-y-4">
            <h2 className="text-xl font-bold">Search your corpus. Annotate your search results with feedback.</h2>
            <p className="text-muted-foreground text-lg">
              Annotate search results from your retrieval stack with feedback. Tell Pi which results are relevant and see your search recalibrate in real-time.
            </p>
            <button
              onClick={() => setOpenCodeModal("feedback")}
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <Code className="w-4 h-4" />
              See the code
            </button>
          </div>
        </div>
      </div>

      {/* Code Modals */}
      <CodeSnippetModal
        open={openCodeModal === "feedback"}
        onOpenChange={(open) => !open && setOpenCodeModal(null)}
        title={CODE_SNIPPETS.scoreFusion.title}
        description={CODE_SNIPPETS.scoreFusion.description}
        code={CODE_SNIPPETS.scoreFusion.code}
        fileName={CODE_SNIPPETS.scoreFusion.fileName}
        githubUrl={CODE_SNIPPETS.scoreFusion.githubUrl}
      />
    </>
  )
}

function ComingSoon() {
  return (
    <div className="flex-[0.6] aspect-video bg-muted rounded-lg flex items-center justify-center border-2 border-dashed relative">
      <div className="absolute inset-0 bg-black bg-opacity-20 rounded-lg"></div>
      <div className="text-center space-y-2 relative z-10">
        <svg
          className="w-12 h-12 mx-auto text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-muted-foreground text-sm font-medium">Coming Soon</p>
      </div>
    </div>
  );
}