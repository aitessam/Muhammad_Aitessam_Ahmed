import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserChatMessageMonthlyUsageSubscriptionBundle1709223456789
  implements MigrationInterface
{
  name = 'UserChatMessageMonthlyUsageSubscriptionBundle1709223456789';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "auth0_id" varchar(255) NOT NULL,
        "email" varchar(255) NOT NULL,
        "role" varchar(50) NOT NULL DEFAULT 'user',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_users_auth0_id" ON "users" ("auth0_id")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_users_email" ON "users" ("email")`
    );

    await queryRunner.query(`
      CREATE TABLE "chat_messages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "question" text NOT NULL,
        "answer" text NOT NULL,
        "token_usage" int NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_chat_messages_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_chat_messages_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_chat_messages_user_id" ON "chat_messages" ("user_id")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_chat_messages_user_created" ON "chat_messages" ("user_id", "created_at")`
    );

    await queryRunner.query(`
      CREATE TABLE "monthly_usages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "year" smallint NOT NULL,
        "month" smallint NOT NULL,
        "free_messages_used" int NOT NULL DEFAULT 0,
        CONSTRAINT "PK_monthly_usages_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_monthly_usages_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_monthly_usages_user_year_month" UNIQUE ("user_id", "year", "month")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_monthly_usages_user_id" ON "monthly_usages" ("user_id")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_monthly_usages_user_year_month" ON "monthly_usages" ("user_id", "year", "month")`
    );

    await queryRunner.query(`
      CREATE TABLE "subscription_bundles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "tier" varchar(20) NOT NULL,
        "max_messages" int NOT NULL,
        "remaining_messages" int NOT NULL,
        "price" decimal(10,2) NOT NULL DEFAULT 0,
        "start_date" date NOT NULL,
        "end_date" date NOT NULL,
        "renewal_date" date,
        "billing_cycle" varchar(20) NOT NULL,
        "auto_renew" boolean NOT NULL DEFAULT true,
        "active" boolean NOT NULL DEFAULT true,
        "cancelled_at" timestamp,
        CONSTRAINT "PK_subscription_bundles_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_subscription_bundles_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_subscription_bundles_tier" CHECK ("tier" IN ('basic', 'pro', 'enterprise')),
        CONSTRAINT "CHK_subscription_bundles_billing_cycle" CHECK ("billing_cycle" IN ('monthly', 'yearly'))
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_subscription_bundles_user_id" ON "subscription_bundles" ("user_id")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_subscription_bundles_user_active" ON "subscription_bundles" ("user_id", "active")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_subscription_bundles_active_cancelled" ON "subscription_bundles" ("active", "cancelled_at")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "subscription_bundles"`);
    await queryRunner.query(`DROP TABLE "monthly_usages"`);
    await queryRunner.query(`DROP TABLE "chat_messages"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
