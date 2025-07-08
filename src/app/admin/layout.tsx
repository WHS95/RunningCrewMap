"use client";

import React from "react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <html>
      <head>
        <meta
          name='naver-site-verification'
          content='naver-verification-code'
        />

        <meta name='msvalidate.01' content='bing-verification-code' />

        <script
          type='text/javascript'
          src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${process.env.NEXT_PUBLIC_RUN_NAVER_CLIENT_ID}&submodules=geocoder`}
          async
        />
      </head>
      <body>
        <div className='flex flex-col min-h-screen'>
          <main className='flex-grow'>{children}</main>
        </div>
      </body>
    </html>
  );
}
