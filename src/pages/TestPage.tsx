import ReviewForm from '../components/ReviewForm'

export default function TestPage() {
  return (
    <div className="py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">测试 - 提交食堂评价</h1>
      <ReviewForm
        canteenId={1}
        onSubmitSuccess={() => console.log('评价提交成功回调')}
      />
    </div>
  )
}
