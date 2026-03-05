use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111111");

#[program]
pub mod examchain {
    use super::*;

    pub fn save_quiz_score(
        ctx: Context<SaveQuizScore>,
        session_id: String,
        pdf_hash: String,
        score: u8,
        total: u8,
    ) -> Result<()> {
        let record = &mut ctx.accounts.quiz_record;
        record.student = ctx.accounts.student.key();
        record.session_id = session_id;
        record.pdf_hash = pdf_hash;
        record.score = score;
        record.total = total;
        record.timestamp = Clock::get()?.unix_timestamp;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(session_id: String)]
pub struct SaveQuizScore<'info> {
    #[account(mut)]
    pub student: Signer<'info>,

    #[account(
        init,
        payer = student,
        space = 8 + 32 + 4 + 64 + 4 + 64 + 1 + 1 + 8,
        seeds = [b"quiz", student.key().as_ref(), session_id.as_bytes()],
        bump
    )]
    pub quiz_record: Account<'info, QuizRecord>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct QuizRecord {
    pub student: Pubkey,
    pub session_id: String,
    pub pdf_hash: String,
    pub score: u8,
    pub total: u8,
    pub timestamp: i64,
}
