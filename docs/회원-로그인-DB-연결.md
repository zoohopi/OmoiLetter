# 오모이레터 회원 · 로그인 · 데이터베이스 연결

## 현재 상태

사이트 코드는 Supabase Auth / PostgreSQL / 비공개 Storage에 연결할 수 있게 구현되어 있습니다.
**실제 Supabase 프로젝트와 Google·카카오 개발자 앱은 아직 생성되지 않았으므로, 외부 DB와 실제 소셜 로그인은 아직 활성화되지 않았습니다.**
대시보드 등록을 마치고 아래 공개 연결값을 넣으면 실제 OAuth 로그인을 사용할 수 있습니다. 테스트용 가짜 로그인을 사용하지 않습니다.

## 1. Supabase 프로젝트 생성과 테이블 설치

1. [Supabase Dashboard](https://supabase.com/dashboard)에서 계정 로그인 → New project.
2. 프로젝트가 준비되면 SQL Editor에서 다음 파일 전체를 실행합니다.
   `supabase/migrations/202611040001_members_books_orders.sql`
3. `profiles`, `books`, `book_assets`, `addresses`, `orders`, `shipments` 테이블과 `book-photos` 비공개 버킷이 생성됩니다.
4. 이 마이그레이션은 새 프로젝트에 한 번 적용합니다. 운영 데이터를 지우거나 테이블을 초기화하지 마세요. 이후 변경은 별도 마이그레이션으로 관리합니다.
5. Connect 또는 Settings의 API Keys에서 Project URL과 publishable key를 확인합니다.
6. `.env.example`을 `.env.local`로 복사하고 다음 두 값을 입력합니다.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://프로젝트ID.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

구형 프로젝트의 `anon` key도 `NEXT_PUBLIC_SUPABASE_ANON_KEY`로 사용할 수 있습니다. `service_role`/secret key는 이 앱에 넣지 않습니다. 연결값 입력 후 개발 서버를 재시작해야 합니다.

## 2. 돌아올 주소 설정

Supabase → Authentication → URL Configuration:

- 개발 중 Site URL: `http://localhost:3000`
- Redirect URLs: `http://localhost:3000/auth/callback`
- 개발 환경에서 redirect query 허용이 필요한 경우 localhost 한정으로 `http://localhost:3000/auth/callback**`를 추가할 수 있습니다.
- 배포 후 Site URL과 Redirect URLs에 실제 HTTPS 도메인과 `/auth/callback`을 등록합니다.

**구글·카카오 개발자 대시보드에 등록하는 주소는 위 앱 주소와 다릅니다.**
두 제공자에는 Supabase가 표시하는 다음 주소를 등록합니다.

```text
https://프로젝트ID.supabase.co/auth/v1/callback
```

## 3. 카카오 로그인

1. [Kakao Developers](https://developers.kakao.com/)에서 오모이레터 앱을 생성합니다.
2. 카카오 로그인 사용 설정을 ON으로 켭니다.
3. REST API 키 설정에서 Redirect URI에 Supabase callback URL을 등록합니다.
4. 카카오 로그인 Client Secret을 활성화합니다.
5. 프로필 닉네임·이미지 동의 항목을 앱에 맞게 설정합니다.
6. Supabase → Authentication → Sign In / Providers → Kakao에서 활성화하고 REST API key(Client ID), Client Secret을 입력합니다.
7. 이메일 동의 권한이 없는 앱은 Supabase Kakao 설정의 **Allow users without an email**을 켭니다. 이 사이트는 이메일 없이도 가입할 수 있고, 연락처와 배송지는 회원정보에서 직접 입력합니다.

이메일 동의 항목은 앱의 자격/설정에 따라 사용 가능 여부가 다릅니다. 필요한 권한만 요청하세요.
카카오 채널 메시지·알림톡 발송은 별도 기능으로, 카카오 로그인만으로 발송되지 않습니다.

## 4. 구글 로그인

1. [Google Cloud Console](https://console.cloud.google.com/)에서 프로젝트와 OAuth 동의 화면/브랜딩을 설정합니다.
2. OAuth Client ID → Web application 유형으로 생성합니다.
3. Authorized redirect URIs에 Supabase callback URL을 등록합니다.
4. Supabase → Authentication → Sign In / Providers → Google에 Client ID와 Client Secret을 입력하고 활성화합니다.
5. 테스트 상태의 앱은 필요한 테스트 사용자를 등록합니다. 일반 소비자에게 공개할 때 Google의 게시 상태·필요한 검증 절차를 완료합니다.

제공자의 비밀키는 Supabase 대시보드에 입력합니다. 채팅이나 소스 코드에 넣지 않습니다.

## 5. 실제 연결 후 확인할 흐름

1. `/login`에서 카카오 또는 Google을 눌러 실제 제공자 동의 화면으로 이동하고 로그인합니다.
2. `/account`에서 회원정보와 배송지를 저장합니다.
3. 비회원으로 작성한 책은 **이 기기의 책 가져오기**를 누릅니다. 비회원 원본은 자동 삭제되지 않습니다.
4. 로그인 상태에서 책을 편집하면 약 1.6초 후 사진과 원고를 자동 보관합니다. 헤더에 `계정에 저장됨`을 확인합니다. 저장 오류가 있으면 보관함에서 재시도합니다.
5. 다른 브라우저/기기에서 같은 계정으로 로그인 → 보관한 책 → 책 열기. 원본 사진, 구도, 편지, 페이지 배치가 복원되는지 확인합니다.
6. 다른 계정으로 로그인해서 이전 회원의 책·사진·주소·주문이 보이지 않는지 확인합니다.
7. 완성된 책의 주문 요청에서 배송지를 선택하면 주문 당시 원고·사진 참조·주소가 고정 보관됩니다.

구글과 카카오 계정이 자동으로 같은 회원이라고 보장하지 않습니다. 제공된 이메일과 Supabase의 계정 연결 정책에 따라 달라집니다. 같은 책을 이어 보려면 같은 로그인 방식을 사용합니다.

## 데이터와 권한

| 데이터 | 저장 방식 |
|---|---|
| 인증 계정 | Supabase Auth, 쿠키 기반 PKCE OAuth |
| 회원정보 | profiles, 회원 본인만 조회·수정 |
| 책 제작 기록 | books.draft JSON, 레이아웃·구도·질문·편지·페이지 포함 |
| 사진 | 비공개 book-photos, 회원 UUID/책 UUID/내용 해시 경로 |
| 사진 메타데이터 | book_assets, 원본과 페이지 연결 |
| 배송지 | addresses, 본인만 조회·추가·수정·삭제 |
| 주문 | orders, 요청 당시 책·주소 스냅샷 고정 |
| 배송 | shipments, 본인의 주문에 대한 배송만 조회 |

클라이언트는 주문의 결제/제작/배송 상태와 송장 번호를 변경할 권한이 없습니다. 관리자 권한의 Supabase Dashboard에서 등록할 수 있습니다. 추후 결제 웹훅·택배 연동 시 서버 전용 경로에서 처리해야 합니다.
이 단계는 **주문 요청 보관**까지 구현했습니다. 금액 계산, PG 결제, 자동 제작 발주, 송장 자동 수집, 배송 알림은 연결하지 않았습니다.

회원별 로컬 캐시도 나뉩니다. 로그아웃 후 다른 회원에게 이전 작업이 자동 귀속되지 않습니다. 비회원 자료 가져오기는 사용자의 명시적 버튼으로 진행합니다.
책에는 버전 검사가 있어 다른 기기의 최신 작업을 오래된 탭이 덮어쓰지 않습니다. 충돌한 로컬 작업은 **현재 작업을 새 책으로 보관**으로 별도 보존할 수 있습니다.

## 개발 검사

```powershell
npm run test:db
npx tsc --noEmit --incremental false
npm run build
```

DB 테스트는 PGlite(PostgreSQL) 격리 엔진에서 실제 마이그레이션·RLS·트랜잭션을 검사합니다. Supabase Auth/Storage 시스템 테이블은 필요한 최소 구조로 구성하므로, 위 실제 제공자 로그인과 버킷 파일 업로드·재로그인 테스트도 연결 후 진행해야 합니다.
오래된/실패한 업로드의 비공개 사진은 주문 이력 보호를 위해 브라우저에서 삭제하지 않습니다. 운영 시 보관 기간과 미참조 파일 정리는 서버 관리 작업으로 구성합니다.

## 공식 설정 문서

- [Supabase Next.js SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs)
- [Kakao 로그인](https://supabase.com/docs/guides/auth/social-sign-in/auth-kakao)
- [Google 로그인](https://supabase.com/docs/guides/auth/social-sign-in/auth-google)
