This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## 오모이레터 회원 · 로그인 · DB

카카오/Google OAuth, 회원별 책·원본 사진 보관, 주문 요청과 배송지 스냅샷, 회원정보/배송지 관리를 구현했습니다.
실제 서비스 연결은 [회원·로그인·DB 연결 안내](docs/회원-로그인-DB-연결.md)를 따릅니다. `.env.example`의 공개 연결값과 제공자 대시보드 등록이 필요합니다.

- 로그인: `/login`
- 내 책·주문·회원정보: `/account`
- DB 마이그레이션: `supabase/migrations/202611040001_members_books_orders.sql`
- DB 격리·권한 검사: `npm run test:db`

연결값이 없으면 OAuth 버튼은 비활성화되며, 기존 비회원 편집은 유지됩니다. PG 결제·자동 택배 연동은 아직 포함하지 않습니다.

## 관리자 주문 · 발주

- 접속: `/admin`
- 발주할 것 / 발주 완료·배송 중 / 배송 완료·취소 구분
- 고객정보·주문 주소·확정 원고 PDF, 발주 기록·송장 관리
- 최초 관리자 UID 등록과 PDF 서버 설정: [관리자 사용 안내](docs/관리자-발주-사용안내.md)
- 추가 마이그레이션: `supabase/migrations/202611040002_admin_fulfillment.sql`

실제 주문 조회는 Supabase/OAuth 연결 및 관리자 등록 이후 사용할 수 있습니다. 제작소 발주와 택배 상태 확인은 수동입니다.
